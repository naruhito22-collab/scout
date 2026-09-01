import type { DirectionPlan, NormalizedSearchImage } from "@/lib/types";
import { evaluateAndSelectRepresentativeSet } from "@/lib/providers/image-evaluator";

export async function selectRepresentativeSet(
  images: NormalizedSearchImage[],
  direction: Pick<DirectionPlan, "title" | "description" | "searchQueries">
): Promise<NormalizedSearchImage[]> {
  return evaluateAndSelectRepresentativeSet(direction, images);
}
