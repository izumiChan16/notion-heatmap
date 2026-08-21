import { describe, expect, it } from 'vitest';
import {
  buildHeatmapCalendar,
  enumerateDateKeys,
  getHeatmapRange,
  toDateKeyInTimezone,
} from './dates';

describe('heatmap date utilities', () => {
  it('generates every date in a leap year', () => {
    const dates = enumerateDateKeys({ start: '2024-01-01', end: '2024-12-31' });
    expect(dates).toHaveLength(366);
    expect(dates[59]).toBe('2024-02-29');
  });

  it('pads the grid into complete Sunday-first weeks', () => {
    const calendar = buildHeatmapCalendar(
      { start: '2026-01-01', end: '2026-01-10' },
      { '2026-01-03': 4 },
      '2026-01-10',
    );
    expect(calendar.cells).toHaveLength(14);
    expect(calendar.cells.slice(0, 4)).toEqual([null, null, null, null]);
    expect(calendar.weekCount).toBe(2);
  });

  it('keeps future cells empty even when a count is supplied', () => {
    const calendar = buildHeatmapCalendar(
      { start: '2026-01-01', end: '2026-01-03' },
      { '2026-01-03': 9 },
      '2026-01-02',
    );
    const future = calendar.cells.find((cell) => cell?.date === '2026-01-03');
    expect(future).toMatchObject({ count: 0, level: 0, isFuture: true });
  });

  it('creates month labels at their first visible week', () => {
    const calendar = buildHeatmapCalendar(
      { start: '2026-01-01', end: '2026-03-31' },
      {},
      '2026-12-31',
    );
    expect(calendar.months.map((month) => month.label)).toEqual(['Jan', 'Feb', 'Mar']);
  });

  it('uses configured timezone for datetime date keys', () => {
    expect(toDateKeyInTimezone('2025-12-31T16:30:00.000Z', 'Asia/Taipei')).toBe('2026-01-01');
    expect(toDateKeyInTimezone('2025-12-31T16:30:00.000Z', 'America/Los_Angeles')).toBe('2025-12-31');
  });

  it('builds a complete rolling year with leap-day-safe boundaries', () => {
    const range = getHeatmapRange(
      { mode: 'rollingYear', year: null },
      'UTC',
      new Date('2024-02-29T12:00:00.000Z'),
    );
    expect(range).toEqual({ start: '2023-03-01', end: '2024-02-29' });
    expect(enumerateDateKeys(range)).toHaveLength(366);
  });
});
