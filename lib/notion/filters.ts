import type { QueryDataSourceParameters } from '@notionhq/client';
import { AppError } from '@/lib/errors';
import type { HeatmapSource } from '@/types/config';

type NotionFilter = NonNullable<QueryDataSourceParameters['filter']>;
type AndItem = Extract<NotionFilter, { and: unknown }>['and'][number];

export function buildSourceFilter(source: HeatmapSource): NotionFilter {
  const and: AndItem[] = [{ property: source.dateProperty, date: { is_not_empty: true } }];

  for (const filter of source.filters) {
    if (filter.type === 'checkbox') {
      if (typeof filter.value !== 'boolean') {
        throw new AppError('CONFIG_INVALID', 400, 'Checkbox filter must be boolean.');
      }
      and.push({ property: filter.property, checkbox: { equals: filter.value } });
      continue;
    }

    if (typeof filter.value !== 'string' && !Array.isArray(filter.value)) {
      throw new AppError('CONFIG_INVALID', 400, 'Filter values are invalid.');
    }

    if (filter.type === 'multi_select') {
      and.push({ property: filter.property, multi_select: { contains: filter.value } });
    } else if (filter.type === 'select') {
      and.push({ property: filter.property, select: { equals: filter.value } });
    } else if (filter.type === 'status') {
      and.push({ property: filter.property, status: { equals: filter.value } });
    } else {
      throw new AppError('CONFIG_INVALID', 400, 'Unsupported filter type.');
    }
  }

  return { and };
}
