export interface NoShowProfile {
  userId: string;
  noShows: number;
  riskLevel: "low" | "medium" | "high";
}
