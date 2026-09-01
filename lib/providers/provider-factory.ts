import type { ImageSearchProvider } from "./image-search";
import { MockSearchProvider } from "./mock-search";
import { PexelsSearchProvider } from "./pexels-search";

export function getPrimarySearchProvider(): ImageSearchProvider {
  if (process.env.SCOUT_MODE === "live" && process.env.PEXELS_API_KEY) {
    return new PexelsSearchProvider(process.env.PEXELS_API_KEY);
  }
  return new MockSearchProvider();
}
