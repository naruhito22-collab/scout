import type { DirectionPlan, NormalizedSearchImage } from "@/lib/types";
import { evaluateAndSelectFour } from "@/lib/providers/image-evaluator";

export async function selectRepresentativeFour(
  images: NormalizedSearchImage[],
  direction: Pick<DirectionPlan, "title" | "description" | "searchQueries">
): Promise<NormalizedSearchImage[]> {
  return evaluateAndSelectFour(direction, images);
}
