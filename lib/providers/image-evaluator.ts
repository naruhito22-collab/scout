import OpenAI from "openai";
import type { NormalizedSearchImage } from "@/lib/types";

type DirectionContext = {
  title: string;
  description: string;
  searchQueries: string[];
};

function fallbackSelect(images: NormalizedSearchImage[]): NormalizedSearchImage[] {
  if (images.length <= 4) return images;
  const indexes = [0, Math.floor(images.length * 0.33), Math.floor(images.length * 0.66), images.length - 1];
  return indexes.map((i) => images[i]).filter(Boolean).slice(0, 4);
}

export async function evaluateAndSelectRepresentativeSet(
  context: DirectionContext,
  images: NormalizedSearchImage[]
): Promise<NormalizedSearchImage[]> {
  if (images.length <= 4) return images;

  const model = process.env.OPENAI_VISION_MODEL;
  if (process.env.SCOUT_MODE !== "live" || !process.env.OPENAI_API_KEY || !model) {
    return fallbackSelect(images);
  }

  const candidates = images.slice(0, 16);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      assessments: {
        type: "array",
        minItems: candidates.length,
        maxItems: candidates.length,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            index: { type: "integer", minimum: 0, maximum: candidates.length - 1 },
            relevance: { type: "integer", minimum: 1, maximum: 5 },
            backgroundUsefulness: { type: "integer", minimum: 1, maximum: 5 },
            clarity: { type: "integer", minimum: 1, maximum: 5 },
            distinctiveness: { type: "integer", minimum: 1, maximum: 5 },
            noise: { type: "integer", minimum: 1, maximum: 5 },
            note: { type: "string" }
          },
          required: ["index", "relevance", "backgroundUsefulness", "clarity", "distinctiveness", "noise", "note"]
        }
      },
      selectedIndexes: {
        type: "array",
        minItems: 4,
        maxItems: 4,
        items: { type: "integer", minimum: 0, maximum: candidates.length - 1 }
      }
    },
    required: ["assessments", "selectedIndexes"]
  } as const;

  const userContent: any[] = [
    {
      type: "input_text",
      text: [
        `DIRECTION: ${context.title}`,
        `DESCRIPTION: ${context.description}`,
        `SEARCH QUERIES: ${context.searchQueries.join(" | ")}`,
        "Choose exactly four images that explain this direction at a glance.",
        "Keep the four coherent, but avoid near-duplicates."
      ].join("\n")
    }
  ];

  candidates.forEach((image, index) => {
    userContent.push({ type: "input_text", text: `CANDIDATE ${index}` });
    userContent.push({ type: "input_image", image_url: image.imageUrl, detail: "low" });
  });

  try {
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "You are SCOUT's commercial visual-reference editor.",
                "Evaluate stock-photo candidates as background references, not final assets.",
                "Select exactly four images.",
                "Prefer useful breadth across composition, space/material, and lighting/mood.",
                "Penalize irrelevant subjects, text-heavy images, poor quality, and near-duplicates."
              ].join("\n")
            }
          ]
        },
        { role: "user", content: userContent }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "scout_image_selection",
          schema,
          strict: true
        }
      }
    });

    const parsed = JSON.parse(response.output_text) as { selectedIndexes?: number[] };
    const selectedIndexes = Array.from(new Set(parsed.selectedIndexes ?? []))
      .filter((index) => Number.isInteger(index) && index >= 0 && index < candidates.length)
      .slice(0, 4);

    if (selectedIndexes.length !== 4) return fallbackSelect(candidates);
    return selectedIndexes.map((index) => candidates[index]);
  } catch (error) {
    console.error("SCOUT Vision selection failed; using deterministic fallback", error);
    return fallbackSelect(candidates);
  }
}
