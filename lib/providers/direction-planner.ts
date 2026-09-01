import OpenAI from "openai";
import fs from "node:fs/promises";
import path from "node:path";
import type { DirectionPlan, ReferenceInput } from "@/lib/types";

const mockPlans: DirectionPlan[] = [
  ["Quiet Private Lounge", "暗い木と柔らかい局所照明。閉じた上質な夜。", ["quiet luxury lounge dark wood night", "private lounge warm lamp empty"]],
  ["Architectural Shadow", "石やコンクリートを主役にした静かな陰影。", ["minimal concrete interior dramatic shadow", "architectural stone interior low light"]],
  ["Urban Glass Night", "ガラスと夜景。都市の距離感と冷たい光。", ["modern glass apartment city night empty", "luxury penthouse night interior"]],
  ["Japanese Contemporary", "木・石・低い光。和の気配を抑制的に。", ["japanese modern interior dark wood stone", "minimal japanese residence evening"]],
  ["Warm Residential", "高級ホテルではなく、静かな生活の余韻。", ["warm modern home evening empty", "quiet residential interior night"]],
  ["Metallic Precision", "金属・黒・硬質な反射。プロダクト広告寄り。", ["dark metallic architecture interior", "black metal minimal interior light"]],
  ["Open Pale Space", "明るい余白と淡い素材。テーマを反転して見る。", ["bright minimal interior pale stone", "soft daylight minimal architecture"]],
  ["Dawn Transition", "夜明け直前の青さ。時間の境目を感じる空間。", ["blue hour empty interior dawn", "pre dawn architecture interior"]]
].map(([title, description, searchQueries], i) => ({ order: i + 1, title: title as string, description: description as string, searchQueries: searchQueries as string[] }));

async function localImageDataUrl(url: string) {
  if (!url.startsWith("/uploads/")) return url;
  const file = path.join(process.cwd(), "public", url.replace(/^\//, ""));
  const buf = await fs.readFile(file);
  const ext = path.extname(file).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function planDirections(input: { request: string; references: ReferenceInput[] }): Promise<DirectionPlan[]> {
  if (process.env.SCOUT_MODE !== "live" || !process.env.OPENAI_API_KEY) return mockPlans;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_DIRECTION_MODEL;
  if (!model) throw new Error("OPENAI_DIRECTION_MODEL is required in live mode");
  const schema = { type:"object", additionalProperties:false, properties:{ directions:{ type:"array", minItems:8, maxItems:8, items:{ type:"object", additionalProperties:false, properties:{ order:{type:"integer",minimum:1,maximum:8}, title:{type:"string"}, description:{type:"string"}, searchQueries:{type:"array",minItems:3,maxItems:8,items:{type:"string"}} }, required:["order","title","description","searchQueries"] } } }, required:["directions"] } as const;

  const userContent: any[] = [{ type:"input_text", text:`REQUEST:\n${input.request}\n\nReference-image comments override what the image alone may suggest.` }];
  for (const ref of input.references) {
    userContent.push({ type:"input_image", image_url: await localImageDataUrl(ref.imageUrl), detail:"low" });
    if (ref.comment) userContent.push({ type:"input_text", text:`REFERENCE COMMENT: ${ref.comment}` });
  }
  const response = await client.responses.create({
    model,
    reasoning: { effort: "low" },
    input: [
      { role:"system", content:[{type:"input_text", text:"You are SCOUT, a visual-location scouting AI for commercial production. Generate exactly eight visually distinct, coherent background directions. Internally balance 4 core, 3 variations, and 1 useful wildcard. Do not simply rename the same style. Queries must be concise English stock-photo search phrases. Do not require the final image to match reference aspect ratio."}] },
      { role:"user", content:userContent }
    ],
    text:{ format:{ type:"json_schema", name:"scout_directions", schema, strict:true } }
  });
  return JSON.parse(response.output_text).directions;
}
