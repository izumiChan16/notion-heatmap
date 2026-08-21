import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/errors';
import { parseDatabaseId } from './parseDatabaseId';

const compactId = '3f5d6c8b4a1e487ab3f091c65ab821de';

describe('parseDatabaseId', () => {
  it.each([
    compactId,
    '3f5d6c8b-4a1e-487a-b3f0-91c65ab821de',
    `https://www.notion.so/Practice-Log-${compactId}`,
    `https://www.notion.so/Practice-Log-${compactId}?v=0123456789abcdef0123456789abcdef`,
  ])('normalizes supported database input: %s', (input) => {
    expect(parseDatabaseId(input)).toBe(compactId);
  });

  it.each(['', 'not-a-notion-id', '3f5d6c8b4a1e487ab3f091c65ab821d'])('rejects invalid input: %s', (input) => {
    expect(() => parseDatabaseId(input)).toThrow(AppError);
  });
});
