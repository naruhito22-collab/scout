import type { ImageSearchProvider } from "./image-search";
import type { NormalizedSearchImage } from "@/lib/types";

export class MockSearchProvider implements ImageSearchProvider {
  async search(query: string, limit = 24): Promise<NormalizedSearchImage[]> {
    return Array.from({ length: limit }, (_, i) => {
      const seed = encodeURIComponent(`${query}-${i}`);
      return {
        provider: "mock" as const,
        providerId: `${query}-${i}`,
        sourceUrl: `https://picsum.photos/seed/${seed}/1200/800`,
        thumbnailUrl: `https://picsum.photos/seed/${seed}/480/320`,
        imageUrl: `https://picsum.photos/seed/${seed}/1200/800`,
        photographer: "Mock"
      };
    });
  }
}
