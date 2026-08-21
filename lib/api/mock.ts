import { encodePublicConfig } from '@/lib/config/public';
import { enumerateDateKeys, parseDateKey, toDateKey } from '@/lib/heatmap/dates';
import type { ApiClient, SchemaResponse } from '@/types/api';
import type { HeatmapView } from '@/types/config';
import type { HeatmapRange, HeatmapResponse, HeatmapStats } from '@/types/heatmap';
import { ApiClientError } from './client-error';

const MOCK_SIGNATURE = 'mock-signature';

const MOCK_SCHEMA: SchemaResponse = {
  databaseId: '3f5d6c8b4a1e487ab3f091c65ab821de',
  databaseName: 'Daily Practice Log',
  dateProperties: [
    { name: 'Date', type: 'date' },
    { name: 'Completed at', type: 'date' },
  ],
  filterProperties: [
    { name: 'Status', type: 'status', options: ['Done', 'In progress', 'Skipped'] },
    { name: 'Category', type: 'select', options: ['Learning', 'Writing', 'Health'] },
    { name: 'Tags', type: 'multi_select', options: ['Deep work', 'Quick win', 'Weekend'] },
    { name: 'Completed', type: 'checkbox' },
  ],
};

function pause(): Promise<void> {
  if (process.env.NODE_ENV === 'test') return Promise.resolve();
  return new Promise((resolve) => window.setTimeout(resolve, 360));
}

function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (configured) return configured;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}

function getMockRange(view: HeatmapView, now = new Date()): HeatmapRange {
  if (view.mode === 'calendarYear') {
    const year = view.year ?? now.getUTCFullYear();
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }

  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  start.setUTCDate(start.getUTCDate() + 1);
  return { start: toDateKey(start), end: toDateKey(end) };
}

function seededCount(dateKey: string): number {
  const compact = Number(dateKey.replaceAll('-', ''));
  const wave = (compact * 17 + Math.floor(compact / 31)) % 29;
  if (wave < 11) return 0;
  if (wave < 19) return 1;
  if (wave < 24) return 2 + (wave % 2);
  if (wave < 27) return 4 + (wave % 3);
  return 7 + (wave % 4);
}

function calculateStats(range: HeatmapRange, dateCounts: Record<string, number>): HeatmapStats {
  const dates = enumerateDateKeys(range);
  let total = 0;
  let activeDays = 0;
  let longestStreak = 0;
  let runningStreak = 0;

  for (const date of dates) {
    const count = dateCounts[date] ?? 0;
    total += count;
    if (count > 0) {
      activeDays += 1;
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      runningStreak = 0;
    }
  }

  const today = toDateKey(new Date());
  const streakEnd = range.end > today ? today : range.end;
  let cursor = parseDateKey(streakEnd);
  let currentStreak = 0;
  while (cursor >= parseDateKey(range.start) && (dateCounts[toDateKey(cursor)] ?? 0) > 0) {
    currentStreak += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }

  return { total, activeDays, longestStreak, currentStreak };
}

function buildMockHeatmap(view: HeatmapView): HeatmapResponse {
  const range = getMockRange(view);
  const today = toDateKey(new Date());
  const dateCounts = Object.fromEntries(
    enumerateDateKeys(range)
      .filter((date) => date <= today)
      .map((date): [string, number] => [date, seededCount(date)])
      .filter(([, count]) => count > 0),
  );
  const currentYear = new Date().getUTCFullYear();

  return {
    range,
    availableYears: [currentYear, currentYear - 1, currentYear - 2],
    dateCounts,
    stats: calculateStats(range, dateCounts),
  };
}

export const mockApiClient: ApiClient = {
  async fetchSchema(adminKey, databaseUrl) {
    await pause();
    if (!adminKey.trim() || adminKey.toLowerCase() === 'wrong') {
      throw new ApiClientError('ADMIN_KEY_INVALID', 'The admin key is incorrect.');
    }
    if (!databaseUrl.trim()) {
      throw new ApiClientError('DATABASE_INVALID', 'Enter a Notion database URL or ID.');
    }
    if (databaseUrl.toLowerCase().includes('unauthorized')) {
      throw new ApiClientError(
        'NOTION_UNAUTHORIZED',
        'Connect your Notion Integration to this database, then try again.',
      );
    }
    return MOCK_SCHEMA;
  },

  async signConfig(adminKey, config) {
    await pause();
    if (!adminKey.trim() || adminKey.toLowerCase() === 'wrong') {
      throw new ApiClientError('ADMIN_KEY_INVALID', 'The admin key is incorrect.');
    }
    const encoded = encodePublicConfig(config);
    return {
      embedUrl: `${getAppUrl()}/embed?config=mock.${encoded}&sig=${MOCK_SIGNATURE}`,
    };
  },

  async fetchHeatmap(config, sig, view) {
    await pause();
    if (!config.startsWith('mock.') || sig !== MOCK_SIGNATURE) {
      throw new ApiClientError(
        'CONFIG_SIGNATURE_INVALID',
        'This embed link is invalid. Generate a new one from setup.',
      );
    }
    return buildMockHeatmap(view);
  },
};
