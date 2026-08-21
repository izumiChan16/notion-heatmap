import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/errors';
import type { HeatmapConfig } from '@/types/config';
import { validateConfig } from './validate';

export const validConfig: HeatmapConfig = {
  version: 1,
  sources: [
    {
      databaseId: '3f5d6c8b4a1e487ab3f091c65ab821de',
      databaseName: '学习记录',
      dateProperty: '完成日期',
      filters: [],
    },
  ],
  display: { mode: 'rollingYear', theme: 'github' },
  timezone: 'Asia/Taipei',
};

describe('validateConfig', () => {
  it('normalizes the database ID and supported filters', () => {
    const config = validateConfig({
      ...validConfig,
      sources: [
        {
          ...validConfig.sources[0],
          databaseId: '3F5D6C8B-4A1E-487A-B3F0-91C65AB821DE',
          filters: [
            { property: 'Status', type: 'status', value: ['Done', 'Skipped'] },
            { property: 'Completed', type: 'checkbox', value: false },
          ],
        },
      ],
    });

    expect(config.sources[0].databaseId).toBe('3f5d6c8b4a1e487ab3f091c65ab821de');
    expect(config.sources[0].filters).toHaveLength(2);
  });

  it.each([
    ['wrong version', { ...validConfig, version: 2 }],
    ['multiple sources', { ...validConfig, sources: [validConfig.sources[0], validConfig.sources[0]] }],
    ['invalid checkbox', { ...validConfig, sources: [{ ...validConfig.sources[0], filters: [{ property: 'Done', type: 'checkbox', value: 'yes' }] }] }],
    ['empty filter values', { ...validConfig, sources: [{ ...validConfig.sources[0], filters: [{ property: 'Status', type: 'status', value: [] }] }] }],
    ['invalid timezone', { ...validConfig, timezone: 'Moon/Base' }],
    ['missing calendar year', { ...validConfig, display: { mode: 'calendarYear', theme: 'github' } }],
  ])('rejects %s', (_, value) => {
    expect(() => validateConfig(value)).toThrow(AppError);
  });
});
