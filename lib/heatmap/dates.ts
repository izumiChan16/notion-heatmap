import { getHeatmapLevel } from '@/lib/heatmap/levels';
import type { HeatmapLevel, HeatmapRange } from '@/types/heatmap';

const DAY_MS = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type HeatmapCell = {
  date: string;
  count: number;
  level: HeatmapLevel;
  isFuture: boolean;
  weekIndex: number;
};

export type MonthLabel = {
  label: string;
  weekIndex: number;
};

export type HeatmapCalendar = {
  cells: Array<HeatmapCell | null>;
  months: MonthLabel[];
  weekCount: number;
};

export function parseDateKey(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid date key: ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function enumerateDateKeys(range: HeatmapRange): string[] {
  const start = parseDateKey(range.start);
  const end = parseDateKey(range.end);
  if (start.getTime() > end.getTime()) return [];

  const dates: string[] = [];
  for (let time = start.getTime(); time <= end.getTime(); time += DAY_MS) {
    dates.push(toDateKey(new Date(time)));
  }
  return dates;
}

export function buildHeatmapCalendar(
  range: HeatmapRange,
  dateCounts: Record<string, number>,
  today = toDateKey(new Date()),
): HeatmapCalendar {
  const dates = enumerateDateKeys(range);
  if (dates.length === 0) return { cells: [], months: [], weekCount: 0 };

  const leadingEmptyCells = parseDateKey(dates[0]).getUTCDay();
  const cells: Array<HeatmapCell | null> = Array.from({ length: leadingEmptyCells }, () => null);
  const rawMonths: MonthLabel[] = [];

  dates.forEach((date, index) => {
    const parsed = parseDateKey(date);
    const cellIndex = leadingEmptyCells + index;
    const weekIndex = Math.floor(cellIndex / 7);
    const count = date > today ? 0 : Math.max(0, dateCounts[date] ?? 0);

    if (index === 0 || parsed.getUTCDate() === 1) {
      rawMonths.push({ label: MONTHS[parsed.getUTCMonth()], weekIndex });
    }

    cells.push({
      date,
      count,
      level: getHeatmapLevel(count),
      isFuture: date > today,
      weekIndex,
    });
  });

  while (cells.length % 7 !== 0) cells.push(null);

  const months = rawMonths.filter((month, index) => {
    if (index === 0) return true;
    return month.weekIndex - rawMonths[index - 1].weekIndex >= 3;
  });

  return { cells, months, weekCount: cells.length / 7 };
}

export function formatDateLabel(dateKey: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parseDateKey(dateKey));
}
