import { describe, expect, it } from 'vitest';
import type { HeatmapSource } from '@/types/config';
import { buildSourceFilter } from './filters';

const source: HeatmapSource = {
  databaseId: '3f5d6c8b4a1e487ab3f091c65ab821de',
  dateProperty: 'Date',
  filters: [
    { property: 'Status', type: 'status', value: ['Done', 'Skipped'] },
    { property: 'Tags', type: 'multi_select', value: 'Deep work' },
    { property: 'Completed', type: 'checkbox', value: true },
  ],
};

describe('buildSourceFilter', () => {
  it('combines filter conditions with AND and preserves same-property OR values', () => {
    expect(buildSourceFilter(source)).toEqual({
      and: [
        { property: 'Date', date: { is_not_empty: true } },
        { property: 'Status', status: { equals: ['Done', 'Skipped'] } },
        { property: 'Tags', multi_select: { contains: 'Deep work' } },
        { property: 'Completed', checkbox: { equals: true } },
      ],
    });
  });
});
