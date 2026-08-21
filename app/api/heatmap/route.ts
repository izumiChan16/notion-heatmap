import { isFullDataSource } from '@notionhq/client';
import { NextResponse } from 'next/server';
import {
  MAX_ENCODED_CONFIG_LENGTH,
  decodeAndValidateConfig,
  verifyEncodedConfig,
} from '@/lib/config/sign';
import { AppError, errorResponse } from '@/lib/errors';
import { aggregatePages } from '@/lib/heatmap/aggregate';
import { getHeatmapRange, todayInTimezone } from '@/lib/heatmap/dates';
import { availableYears, calculateStats, countsForRange } from '@/lib/heatmap/stats';
import { createNotionClient } from '@/lib/notion/client';
import { buildSourceFilter } from '@/lib/notion/filters';
import { queryAllPages } from '@/lib/notion/query';
import { resolvePrimaryDataSource } from '@/lib/notion/resolveDataSource';
import type { HeatmapConfig, HeatmapView } from '@/types/config';

export const runtime = 'nodejs';

const MAX_SIGNATURE_LENGTH = 256;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidSignature(): never {
  throw new AppError(
    'CONFIG_SIGNATURE_INVALID',
    401,
    'This embed link is invalid. Generate a new one from setup.',
  );
}

function validateView(input: unknown, fallback: HeatmapConfig['display']): HeatmapView {
  const candidate = input === undefined ? fallback : input;
  if (!isRecord(candidate)) {
    throw new AppError('CONFIG_INVALID', 400, 'The requested view is invalid.');
  }

  if (candidate.mode === 'rollingYear') return { mode: 'rollingYear', year: null };
  if (
    candidate.mode === 'calendarYear' &&
    Number.isInteger(candidate.year) &&
    Number(candidate.year) >= 1970 &&
    Number(candidate.year) <= 2100
  ) {
    return { mode: 'calendarYear', year: Number(candidate.year) };
  }

  throw new AppError('CONFIG_INVALID', 400, 'The requested view is invalid.');
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (
      !isRecord(body) ||
      typeof body.config !== 'string' ||
      body.config.length === 0 ||
      body.config.length > MAX_ENCODED_CONFIG_LENGTH ||
      typeof body.sig !== 'string' ||
      body.sig.length === 0 ||
      body.sig.length > MAX_SIGNATURE_LENGTH
    ) {
      invalidSignature();
    }

    // This verification must happen before a Notion client is created or queried.
    if (!verifyEncodedConfig(body.config, body.sig)) invalidSignature();

    const config = decodeAndValidateConfig(body.config);
    const view = validateView(body.view, config.display);
    const source = config.sources[0];
    const notion = createNotionClient();
    const { dataSourceId } = await resolvePrimaryDataSource(notion, source.databaseId);
    const dataSource = await notion.dataSources.retrieve({ data_source_id: dataSourceId });

    if (!isFullDataSource(dataSource)) {
      throw new AppError('DATABASE_INVALID', 400, 'The data source schema is incomplete.');
    }

    const dateProperty = dataSource.properties[source.dateProperty];
    if (!dateProperty || dateProperty.type !== 'date') {
      throw new AppError(
        'DATABASE_NO_DATE_FIELD',
        400,
        'The configured date property no longer exists.',
      );
    }

    const pages = await queryAllPages(notion, {
      data_source_id: dataSourceId,
      filter: buildSourceFilter(source),
      filter_properties: [dateProperty.id],
    });
    const allDateCounts = aggregatePages(pages, source.dateProperty, config.timezone);
    const today = todayInTimezone(config.timezone);
    const range = getHeatmapRange(view, config.timezone);
    const dateCounts = countsForRange(allDateCounts, range, today);

    return NextResponse.json({
      range,
      availableYears: availableYears(allDateCounts),
      dateCounts,
      stats: calculateStats(range, dateCounts, today),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
