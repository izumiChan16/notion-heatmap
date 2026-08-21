import type { FilterType, HeatmapConfig, HeatmapView } from '@/types/config';
import type { HeatmapResponse } from '@/types/heatmap';

export type DateProperty = {
  name: string;
  type: 'date';
};

export type FilterProperty = {
  name: string;
  type: FilterType;
  options?: string[];
};

export type SchemaResponse = {
  databaseId: string;
  databaseName: string;
  dateProperties: DateProperty[];
  filterProperties: FilterProperty[];
};

export type SignConfigResponse = {
  embedUrl: string;
};

export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
  };
};

export type ApiClient = {
  fetchSchema: (adminKey: string, databaseUrl: string) => Promise<SchemaResponse>;
  signConfig: (adminKey: string, config: HeatmapConfig) => Promise<SignConfigResponse>;
  fetchHeatmap: (
    config: string,
    sig: string,
    view: HeatmapView,
  ) => Promise<HeatmapResponse>;
};
