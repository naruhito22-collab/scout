import type { NormalizedSearchImage } from "@/lib/types";

export interface ImageSearchProvider {
  search(query: string, limit?: number): Promise<NormalizedSearchImage[]>;
}
