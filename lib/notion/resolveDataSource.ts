import 'server-only';
import {
  APIErrorCode,
  isFullDatabase,
  isNotionClientError,
  type Client,
} from '@notionhq/client';
import { AppError } from '@/lib/errors';

export async function resolvePrimaryDataSource(notion: Client, databaseId: string) {
  try {
    const database = await notion.databases.retrieve({ database_id: databaseId });
    if (!isFullDatabase(database) || database.data_sources.length === 0) {
      throw new AppError('DATABASE_INVALID', 400, 'This database has no readable data source.');
    }

    return { database, dataSourceId: database.data_sources[0].id };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (isNotionClientError(error)) {
      if (
        error.code === APIErrorCode.ObjectNotFound ||
        error.code === APIErrorCode.RestrictedResource ||
        error.code === APIErrorCode.Unauthorized
      ) {
        throw new AppError(
          'NOTION_UNAUTHORIZED',
          403,
          'Connect your Notion Integration to this database, then try again.',
        );
      }
    }
    throw new AppError('DATABASE_INVALID', 400, 'The database could not be read.');
  }
}
