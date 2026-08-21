export type HeatmapConfig = {
  version: 1;
  sources: HeatmapSource[];
  display: DisplayConfig;
  timezone: string;
};

export type HeatmapSource = {
  databaseId: string;
  databaseUrl?: string;
  databaseName?: string;
  dateProperty: string;
  filters: SourceFilter[];
};

export type FilterType = 'status' | 'select' | 'multi_select' | 'checkbox';

export type SourceFilter = {
  property: string;
  type: FilterType;
  value: string | boolean | string[];
};

export type ViewMode = 'rollingYear' | 'calendarYear';

export type DisplayConfig = {
  mode: ViewMode;
  year?: number;
  theme: 'github';
};

export type HeatmapView = {
  mode: ViewMode;
  year?: number | null;
};
