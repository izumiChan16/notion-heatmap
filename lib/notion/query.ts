import 'server-only';
import {
  isFullPage,
  isNotionClientError,
  type Client,
  type PageObjectResponse,
  type QueryDataSourceParameters,
} from '@notionhq/client';
import { AppError } from '@/lib/errors';

type QueryClient = {
  dataSources: Pick<Client['dataSources'], 'query'>;
};

export async function queryAllPages(
  notion: QueryClient,
  args: Omit<QueryDataSourceParameters, 'start_cursor' | 'page_size' | 'result_type'>,
): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  try {
    do {
      const response = await notion.dataSources.query({
        ...args,
        start_cursor: cursor,
        page_size: 100,
        result_type: 'page',
      });

      for (const result of response.results) {
        if (isFullPage(result)) pages.push(result);
      }

      if (response.request_status?.type === 'incomplete') {
        throw new AppError('NOTION_QUERY_FAILED', 502, 'The Notion query returned incomplete data.');
      }

      cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
    } while (cursor);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (isNotionClientError(error) && error.name === 'RequestTimeoutError') {
      throw new AppError('TIMEOUT', 504, 'The Notion query timed out. Try again.');
    }
    throw new AppError('NOTION_QUERY_FAILED', 502, 'The server could not query Notion.');
  }

  return pages;
}
