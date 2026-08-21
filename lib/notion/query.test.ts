import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@/lib/errors';
import { queryAllPages } from './query';

function page(id: string) {
  return { object: 'page', id, url: `https://notion.so/${id}` };
}

describe('queryAllPages', () => {
  it('collects every full page across pagination', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        results: Array.from({ length: 100 }, (_, index) => page(`page-${index}`)),
        has_more: true,
        next_cursor: 'next',
      })
      .mockResolvedValueOnce({
        results: Array.from({ length: 100 }, (_, index) => page(`page-${index + 100}`)),
        has_more: true,
        next_cursor: 'final',
      })
      .mockResolvedValueOnce({
        results: Array.from({ length: 50 }, (_, index) => page(`page-${index + 200}`)),
        has_more: false,
        next_cursor: null,
      });

    const result = await queryAllPages({ dataSources: { query } } as never, {
      data_source_id: 'source',
    });

    expect(result).toHaveLength(250);
    expect(query).toHaveBeenCalledTimes(3);
    expect(query).toHaveBeenNthCalledWith(1, expect.objectContaining({ page_size: 100, start_cursor: undefined }));
    expect(query).toHaveBeenNthCalledWith(2, expect.objectContaining({ start_cursor: 'next' }));
  });

  it('rejects an incomplete Notion response', async () => {
    const query = vi.fn().mockResolvedValue({
      results: [],
      has_more: false,
      next_cursor: null,
      request_status: { type: 'incomplete' },
    });

    await expect(
      queryAllPages({ dataSources: { query } } as never, { data_source_id: 'source' }),
    ).rejects.toMatchObject({ code: 'NOTION_QUERY_FAILED', status: 502 } satisfies Partial<AppError>);
  });
});
