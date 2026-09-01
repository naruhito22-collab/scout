import type { NormalizedSearchImage } from "@/lib/types";

export function selectRepresentativeFour(images: NormalizedSearchImage[]): NormalizedSearchImage[] {
  // Phase 1 vertical slice: deterministic spacing across the result pool.
  // Replace with Vision-assisted set selection after E2E is verified.
  if (images.length <= 4) return images;
  const indexes = [0, Math.floor(images.length * 0.28), Math.floor(images.length * 0.58), images.length - 1];
  return indexes.map((i) => images[i]).filter(Boolean);
}
