import type { HeatmapRange, HeatmapStats } from '@/types/heatmap';
import { addDays, enumerateDateKeys } from './dates';

export function countsForRange(
  allCounts: Record<string, number>,
  range: HeatmapRange,
  today: string,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(allCounts).filter(
      ([date, count]) => date >= range.start && date <= range.end && date <= today && count > 0,
    ),
  );
}

export function availableYears(allCounts: Record<string, number>): number[] {
  return [...new Set(Object.keys(allCounts).map((date) => Number(date.slice(0, 4))))]
    .filter(Number.isInteger)
    .sort((left, right) => right - left);
}

export function calculateStats(
  range: HeatmapRange,
  counts: Record<string, number>,
  today: string,
): HeatmapStats {
  const effectiveEnd = range.end < today ? range.end : today;
  const dates = enumerateDateKeys({ start: range.start, end: effectiveEnd });
  let total = 0;
  let activeDays = 0;
  let longestStreak = 0;
  let runningStreak = 0;

  for (const date of dates) {
    const count = counts[date] ?? 0;
    total += count;
    if (count > 0) {
      activeDays += 1;
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      runningStreak = 0;
    }
  }

  let currentStreak = 0;
  for (let cursor = effectiveEnd; cursor >= range.start; cursor = addDays(cursor, -1)) {
    if ((counts[cursor] ?? 0) === 0) break;
    currentStreak += 1;
  }

  return { total, activeDays, longestStreak, currentStreak };
}
