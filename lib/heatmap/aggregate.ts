import type { PageObjectResponse } from '@notionhq/client';
import { toDateKeyInTimezone } from './dates';

export function aggregatePages(
  pages: PageObjectResponse[],
  dateProperty: string,
  timezone: string,
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const page of pages) {
    const property = page.properties[dateProperty];
    if (!property || property.type !== 'date' || !property.date?.start) continue;

    const key = toDateKeyInTimezone(property.date.start, timezone);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}
