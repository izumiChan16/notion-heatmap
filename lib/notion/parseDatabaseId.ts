import { extractDatabaseId } from '@notionhq/client';
import { AppError } from '@/lib/errors';

export function parseDatabaseId(input: unknown): string {
  if (typeof input !== 'string') {
    throw new AppError('DATABASE_INVALID', 400, 'Enter a valid Notion database URL or ID.');
  }

  const id = extractDatabaseId(input.trim());
  if (!id) {
    throw new AppError('DATABASE_INVALID', 400, 'Enter a valid Notion database URL or ID.');
  }

  return id.replaceAll('-', '').toLowerCase();
}
