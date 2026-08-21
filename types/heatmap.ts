export type HeatmapRange = {
  start: string;
  end: string;
};

export type HeatmapStats = {
  total: number;
  activeDays: number;
  longestStreak: number;
  currentStreak: number;
};

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export type HeatmapResponse = {
  range: HeatmapRange;
  availableYears: number[];
  dateCounts: Record<string, number>;
  stats: HeatmapStats;
};
