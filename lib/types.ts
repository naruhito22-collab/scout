export type ReferenceInput = { imageUrl: string; comment?: string };

export type DirectionPlan = {
  order: number;
  title: string;
  description: string;
  searchQueries: string[];
};

export type NormalizedSearchImage = {
  provider: "mock" | "pexels" | "unsplash";
  providerId: string;
  sourceUrl: string;
  thumbnailUrl: string;
  imageUrl: string;
  photographer?: string;
  width?: number;
  height?: number;
};

export type ImageAssessment = {
  providerId: string;
  relevance: number;
  clarity: number;
  distinctiveness: number;
  usefulness: number;
  tags: string[];
};
