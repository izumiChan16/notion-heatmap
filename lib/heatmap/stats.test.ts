import { describe, expect, it } from 'vitest';
import { calculateStats, countsForRange, availableYears } from './stats';

describe('heatmap stats', () => {
  const range = { start: '2026-01-01', end: '2026-01-06' };

  it('counts activity and treats missing dates as streak breaks', () => {
    const counts = { '2026-01-01': 2, '2026-01-02': 1, '2026-01-04': 5, '2026-01-05': 1 };
    expect(calculateStats(range, counts, '2026-01-06')).toEqual({
      total: 9,
      activeDays: 4,
      longestStreak: 2,
      currentStreak: 0,
    });
  });

  it('excludes future dates from returned counts and all statistics', () => {
    const counts = { '2026-01-02': 1, '2026-01-04': 10, '2026-01-06': 20 };
    const limited = countsForRange(counts, range, '2026-01-03');
    expect(limited).toEqual({ '2026-01-02': 1 });
    expect(calculateStats(range, limited, '2026-01-03')).toEqual({
      total: 1,
      activeDays: 1,
      longestStreak: 1,
      currentStreak: 0,
    });
  });

  it('returns distinct years in descending order', () => {
    expect(availableYears({ '2024-01-01': 1, '2026-01-01': 2, '2025-01-01': 3 })).toEqual([
      2026,
      2025,
      2024,
    ]);
  });
});
