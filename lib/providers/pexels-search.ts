import type { ImageSearchProvider } from "./image-search";
import type { NormalizedSearchImage } from "@/lib/types";

export class PexelsSearchProvider implements ImageSearchProvider {
  constructor(private apiKey: string) {}

  async search(query: string, limit = 24): Promise<NormalizedSearchImage[]> {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", String(Math.min(limit, 80)));
    const res = await fetch(url, { headers: { Authorization: this.apiKey }, cache: "no-store" });
    if (!res.ok) throw new Error(`Pexels search failed: ${res.status}`);
    const data = await res.json();
    return (data.photos ?? []).map((p: any) => ({
      provider: "pexels" as const,
      providerId: String(p.id),
      sourceUrl: p.url,
      thumbnailUrl: p.src?.medium,
      imageUrl: p.src?.large2x ?? p.src?.large ?? p.src?.original,
      photographer: p.photographer,
      width: p.width,
      height: p.height
    }));
  }
}
