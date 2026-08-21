import { AppError } from '@/lib/errors';
import type { HeatmapConfig, SourceFilter } from '@/types/config';

const MIN_CALENDAR_YEAR = 1970;
const MAX_CALENDAR_YEAR = 2100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(message: string): never {
  throw new AppError('CONFIG_INVALID', 400, message);
}

function validTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function validateFilter(value: unknown): SourceFilter {
  if (!isRecord(value)) invalid('Invalid filter.');

  const property = typeof value.property === 'string' ? value.property.trim() : '';
  if (!property) invalid('Filter property is required.');

  if (value.type === 'checkbox') {
    if (typeof value.value !== 'boolean') invalid('Checkbox filter must be boolean.');
    return { property, type: 'checkbox', value: value.value };
  }

  if (value.type !== 'status' && value.type !== 'select' && value.type !== 'multi_select') {
    invalid('Unsupported filter type.');
  }

  if (typeof value.value === 'string') {
    const normalized = value.value.trim();
    if (!normalized) invalid('Filter values cannot be empty.');
    return { property, type: value.type, value: normalized };
  }

  if (Array.isArray(value.value)) {
    const normalized = value.value.map((item) => (typeof item === 'string' ? item.trim() : ''));
    if (normalized.length === 0 || normalized.some((item) => !item)) {
      invalid('Filter values cannot be empty.');
    }
    return { property, type: value.type, value: normalized };
  }

  return invalid('Filter values cannot be empty.');
}

export function validateConfig(input: unknown): HeatmapConfig {
  if (!isRecord(input) || input.version !== 1) invalid('Unsupported config version.');
  if (!Array.isArray(input.sources) || input.sources.length !== 1) {
    invalid('MVP requires exactly one source.');
  }

  const rawSource = input.sources[0];
  if (!isRecord(rawSource)) invalid('Invalid source.');

  const databaseId =
    typeof rawSource.databaseId === 'string'
      ? rawSource.databaseId.replaceAll('-', '').toLowerCase()
      : '';
  if (!/^[0-9a-f]{32}$/.test(databaseId)) invalid('Invalid database ID.');

  const dateProperty = typeof rawSource.dateProperty === 'string' ? rawSource.dateProperty.trim() : '';
  if (!dateProperty) invalid('Date property is required.');
  if (!Array.isArray(rawSource.filters) || rawSource.filters.length > 20) invalid('Invalid filters.');

  const databaseUrl = rawSource.databaseUrl;
  const databaseName = rawSource.databaseName;
  if (databaseUrl !== undefined && typeof databaseUrl !== 'string') invalid('Invalid database URL.');
  if (databaseName !== undefined && typeof databaseName !== 'string') invalid('Invalid database name.');

  if (!isRecord(input.display)) invalid('Display configuration is required.');
  const mode = input.display.mode;
  if (mode !== 'rollingYear' && mode !== 'calendarYear') invalid('Invalid display mode.');
  if (input.display.theme !== 'github') invalid('Unsupported theme.');

  let year: number | undefined;
  if (mode === 'calendarYear') {
    if (
      !Number.isInteger(input.display.year) ||
      Number(input.display.year) < MIN_CALENDAR_YEAR ||
      Number(input.display.year) > MAX_CALENDAR_YEAR
    ) {
      invalid('Calendar year is invalid.');
    }
    year = Number(input.display.year);
  }

  const timezone = typeof input.timezone === 'string' ? input.timezone.trim() : '';
  if (!timezone || !validTimezone(timezone)) invalid('Timezone is invalid.');

  return {
    version: 1,
    sources: [
      {
        databaseId,
        ...(databaseUrl ? { databaseUrl } : {}),
        ...(databaseName ? { databaseName } : {}),
        dateProperty,
        filters: rawSource.filters.map(validateFilter),
      },
    ],
    display: {
      mode,
      ...(year === undefined ? {} : { year }),
      theme: 'github',
    },
    timezone,
  };
}
