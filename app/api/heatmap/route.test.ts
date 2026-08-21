import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyEncodedConfig: vi.fn(),
  decodeAndValidateConfig: vi.fn(),
  createNotionClient: vi.fn(),
  resolvePrimaryDataSource: vi.fn(),
  queryAllPages: vi.fn(),
}));

vi.mock('@/lib/config/sign', () => ({
  MAX_ENCODED_CONFIG_LENGTH: 16_384,
  verifyEncodedConfig: mocks.verifyEncodedConfig,
  decodeAndValidateConfig: mocks.decodeAndValidateConfig,
}));
vi.mock('@/lib/notion/client', () => ({ createNotionClient: mocks.createNotionClient }));
vi.mock('@/lib/notion/resolveDataSource', () => ({
  resolvePrimaryDataSource: mocks.resolvePrimaryDataSource,
}));
vi.mock('@/lib/notion/query', () => ({ queryAllPages: mocks.queryAllPages }));
vi.mock('@/lib/notion/filters', () => ({ buildSourceFilter: vi.fn(() => ({ and: [] })) }));
vi.mock('@/lib/heatmap/aggregate', () => ({ aggregatePages: vi.fn(() => ({ '2026-01-01': 2 })) }));
vi.mock('@/lib/heatmap/dates', () => ({
  todayInTimezone: vi.fn(() => '2026-01-01'),
  getHeatmapRange: vi.fn(() => ({ start: '2026-01-01', end: '2026-12-31' })),
}));
vi.mock('@/lib/heatmap/stats', () => ({
  availableYears: vi.fn(() => [2026]),
  countsForRange: vi.fn(() => ({ '2026-01-01': 2 })),
  calculateStats: vi.fn(() => ({ total: 2, activeDays: 1, longestStreak: 1, currentStreak: 1 })),
}));

import { POST } from './route';

afterEach(() => vi.clearAllMocks());

describe('POST /api/heatmap', () => {
  it('rejects a bad signature before it creates a Notion client', async () => {
    mocks.verifyEncodedConfig.mockReturnValue(false);
    const response = await POST(
      new Request('http://localhost/api/heatmap', {
        method: 'POST',
        body: JSON.stringify({ config: 'signed-config', sig: 'bad', view: { mode: 'rollingYear' } }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: 'CONFIG_SIGNATURE_INVALID' } });
    expect(mocks.decodeAndValidateConfig).not.toHaveBeenCalled();
    expect(mocks.createNotionClient).not.toHaveBeenCalled();
  });

  it('queries Notion only after verifying a signed config', async () => {
    const source = {
      databaseId: '3f5d6c8b4a1e487ab3f091c65ab821de',
      dateProperty: 'Date',
      filters: [],
    };
    const client = {
      dataSources: {
        retrieve: vi.fn().mockResolvedValue({
          object: 'data_source',
          properties: { Date: { id: 'date-id', name: 'Date', type: 'date', date: {} } },
        }),
      },
    };
    mocks.verifyEncodedConfig.mockReturnValue(true);
    mocks.decodeAndValidateConfig.mockReturnValue({
      sources: [source],
      display: { mode: 'rollingYear', theme: 'github' },
      timezone: 'Asia/Taipei',
    });
    mocks.createNotionClient.mockReturnValue(client);
    mocks.resolvePrimaryDataSource.mockResolvedValue({ dataSourceId: 'source-id' });
    mocks.queryAllPages.mockResolvedValue([]);

    const response = await POST(
      new Request('http://localhost/api/heatmap', {
        method: 'POST',
        body: JSON.stringify({ config: 'signed-config', sig: 'good', view: { mode: 'rollingYear' } }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.createNotionClient).toHaveBeenCalledOnce();
    expect(mocks.queryAllPages).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ data_source_id: 'source-id', filter_properties: ['date-id'] }),
    );
    expect(await response.json()).toMatchObject({ availableYears: [2026], dateCounts: { '2026-01-01': 2 } });
  });
});
