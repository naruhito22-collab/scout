import OpenAI from "openai";
import type { NormalizedSearchImage } from "@/lib/types";

type DirectionContext = {
  title: string;
  description: string;
  searchQueries: string[];
};

function fallbackSelect(images: NormalizedSearchImage[]): NormalizedSearchImage[] {
  if (images.length <= 6) return images;
  const indexes = [
    0,
    Math.floor(images.length * 0.2),
    Math.floor(images.length * 0.4),
    Math.floor(images.length * 0.6),
    Math.floor(images.length * 0.8),
    images.length - 1
  ];
  return indexes.map((i) => images[i]).filter(Boolean);
}

export async function evaluateAndSelectRepresentativeSet(
  context: DirectionContext,
  images: NormalizedSearchImage[]
): Promise<NormalizedSearchImage[]> {
  if (images.length <= 6) return images;

  const model = process.env.OPENAI_VISION_MODEL;
  if (process.env.SCOUT_MODE !== "live" || !process.env.OPENAI_API_KEY || !model) {
    return fallbackSelect(images);
  }

  // Keep Phase 1 latency/cost bounded. Search may return 20-30+ candidates per direction,
  // but Vision only needs a representative shortlist to choose 4-6 useful references.
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
        maxItems: 6,
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
        "Choose 4 to 6 images that collectively explain this single visual direction at a glance.",
        "Use only four when the direction is already clear. Add a fifth or sixth only when they contribute a genuinely different useful composition, space/material cue, or lighting/mood reference."
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
                "Evaluate stock-photo candidates as BACKGROUND REFERENCES, not as final licensed assets.",
                "The selected set must be coherent as one direction while showing useful internal breadth.",
                "Prefer: anchor/hero, composition variation, material/space variation, and lighting/mood variation.",
                "Select 4-6 images. Prefer fewer images unless extra images add distinct decision-making value.",
                "Penalize literal product shots, prominent people, irrelevant close-ups, text-heavy images, poor-quality images, and near-duplicates.",
                "Do not fill the set with nearly identical images even when they individually score well.",
                "Noise score: 1 means clean/useful; 5 means noisy or mismatched."
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
      .slice(0, 6);

    if (selectedIndexes.length < 4) return fallbackSelect(candidates);
    return selectedIndexes.map((index) => candidates[index]);
  } catch (error) {
    console.error("SCOUT Vision selection failed; using deterministic fallback", error);
    return fallbackSelect(candidates);
  }
}
