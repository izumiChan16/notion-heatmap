import { describe, expect, it } from 'vitest';
import type { PageObjectResponse } from '@notionhq/client';
import { aggregatePages } from './aggregate';

function pageWithDate(start: string | null, property = 'Date'): PageObjectResponse {
  return {
    object: 'page',
    id: crypto.randomUUID(),
    created_time: '2026-01-01T00:00:00.000Z',
    last_edited_time: '2026-01-01T00:00:00.000Z',
    created_by: { object: 'user', id: 'user' },
    last_edited_by: { object: 'user', id: 'user' },
    cover: null,
    icon: null,
    parent: { type: 'data_source_id', data_source_id: 'source', database_id: 'database' },
    archived: false,
    is_archived: false,
    in_trash: false,
    is_locked: false,
    properties: {
      [property]: { id: 'date', type: 'date', date: start ? { start, end: null, time_zone: null } : null },
    },
    url: 'https://notion.so/page',
    public_url: null,
  } as PageObjectResponse;
}

describe('aggregatePages', () => {
  it('uses date-range starts, applies timezone conversion, and accumulates counts', () => {
    const pages = [
      pageWithDate('2026-01-01'),
      pageWithDate('2026-01-01'),
      pageWithDate('2025-12-31T16:30:00.000Z'),
      pageWithDate(null),
    ];

    expect(aggregatePages(pages, 'Date', 'Asia/Taipei')).toEqual({ '2026-01-01': 3 });
  });
});
