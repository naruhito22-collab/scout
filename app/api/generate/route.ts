import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import fs from "node:fs/promises";
import path from "node:path";

function safeLocalPublicPath(url: string) {
  if (!url.startsWith("/")) return null;
  const relative = url.replace(/^\/+/, "");
  if (relative.includes("..")) throw new Error("Invalid local image path");
  return path.join(process.cwd(), "public", relative);
}

async function imageToUpload(url: string, index: number) {
  const localPath = safeLocalPublicPath(url);
  let buffer: Buffer;
  let type = "image/png";

  if (localPath) {
    buffer = await fs.readFile(localPath);
    const ext = path.extname(localPath).toLowerCase();
    type = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
  } else {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not fetch reference image (${res.status})`);
    buffer = Buffer.from(await res.arrayBuffer());
    type = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  }

  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  return toFile(buffer, `reference-${index}.${ext}`, { type });
}

function buildInitialPrompt(brief: any) {
  const direction = brief?.direction ?? {};
  return [
    "Create one new photorealistic commercial background image for a professional photo/video production.",
    "Use the supplied images only as visual references for atmosphere, location character, composition ideas, materials, terrain, and lighting.",
    "Do not copy any one reference image exactly and do not make a collage.",
    "The result should look like a plausible real location that could be photographed.",
    "Keep the image suitable as a background: no text, logos, watermarks, or unnecessary people/products unless the request specifically requires them.",
    `ORIGINAL REQUEST: ${brief?.request ?? ""}`,
    `DIRECTION: ${direction.title ?? ""}`,
    `DIRECTION DESCRIPTION: ${direction.description ?? ""}`,
    `SEARCH CUES: ${(direction.queries ?? []).join(" | ")}`,
    "Landscape composition. Produce a strong first proposal that can be refined in later iterations."
  ].join("\n");
}

function buildRevisionPrompt(brief: any, instruction: string) {
  const direction = brief?.direction ?? {};
  return [
    "Edit the supplied image according to the revision instruction below.",
    "The supplied image is the current approved working image. Preserve its overall identity, realism, and useful parts unless the revision requires a change.",
    "Keep it as a photorealistic commercial background image. Do not add text, logos, or watermarks.",
    `ORIGINAL REQUEST: ${brief?.request ?? ""}`,
    `DIRECTION: ${direction.title ?? ""}`,
    `REVISION: ${instruction}`
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is required" }, { status: 400 });
    }

    const body = await req.json();
    const mode = body.mode === "revise" ? "revise" : "initial";
    const brief = body.brief;
    if (!brief?.direction) {
      return NextResponse.json({ error: "Generation brief is required" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
    let prompt: string;
    let imageUrls: string[];

    if (mode === "revise") {
      const instruction = String(body.instruction ?? "").trim();
      const currentImage = String(body.currentImage ?? "").trim();
      if (!instruction) return NextResponse.json({ error: "Revision instruction is required" }, { status: 400 });
      if (!currentImage) return NextResponse.json({ error: "Current image is required" }, { status: 400 });
      prompt = buildRevisionPrompt(brief, instruction);
      imageUrls = [currentImage];
    } else {
      prompt = buildInitialPrompt(brief);
      const preferred = brief.direction.favoriteImages?.length ? brief.direction.favoriteImages : brief.direction.images;
      imageUrls = (preferred ?? []).map((img: any) => img.imageUrl || img.thumbnailUrl).filter(Boolean).slice(0, 4);
    }

    let result: any;
    if (imageUrls.length > 0) {
      const images = await Promise.all(imageUrls.map((url, index) => imageToUpload(url, index)));
      result = await client.images.edit({
        model: model as any,
        image: images as any,
        prompt,
        size: "1536x1024" as any,
        quality: "low" as any,
      } as any);
    } else {
      result = await client.images.generate({
        model: model as any,
        prompt,
        size: "1536x1024" as any,
        quality: "low" as any,
      } as any);
    }

    const encoded = result.data?.[0]?.b64_json;
    if (!encoded) throw new Error("OpenAI returned no image data");

    const dir = path.join(process.cwd(), "public", "generated");
    await fs.mkdir(dir, { recursive: true });
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    await fs.writeFile(path.join(dir, filename), Buffer.from(encoded, "base64"));

    return NextResponse.json({
      imageUrl: `/generated/${filename}`,
      model,
      quality: "low",
      size: "1536x1024"
    });
  } catch (e: unknown) {
    console.error("SCOUT image generation failed", e);
    const message = e instanceof Error ? e.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
