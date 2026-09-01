import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
const prisma = new PrismaClient();

type RefPayload = { dataUrl: string; comment?: string };

async function saveReference(dataUrl: string, index: number) {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) throw new Error("Invalid reference image");
  const ext = m[1].includes("png") ? "png" : m[1].includes("webp") ? "webp" : "jpg";
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${index}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(m[2], "base64"));
  return `/uploads/${name}`;
}

export async function POST(req: Request) {
  const body = await req.json();
  const request = String(body.request ?? "").trim();
  if (!request) return NextResponse.json({ error: "request is required" }, { status: 400 });
  const refs: RefPayload[] = Array.isArray(body.references) ? body.references.slice(0,2) : [];
  const saved = [] as {imageUrl:string; userComment?:string}[];
  for (let i=0;i<refs.length;i++) {
    if (!refs[i]?.dataUrl) continue;
    saved.push({ imageUrl: await saveReference(refs[i].dataUrl, i), userComment: refs[i].comment?.trim() || undefined });
  }
  const project = await prisma.project.create({
    data: { title: request.slice(0, 32), originalRequest: request, references: { create: saved } },
    include: { references: true }
  });
  return NextResponse.json(project, { status: 201 });
}
