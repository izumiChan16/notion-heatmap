import { describe, expect, it } from 'vitest';
import { getHeatmapLevel } from './levels';

describe('getHeatmapLevel', () => {
  it.each([
    [-1, 0],
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 2],
    [4, 3],
    [6, 3],
    [7, 4],
    [30, 4],
  ])('maps %i records to level %i', (count, level) => {
    expect(getHeatmapLevel(count)).toBe(level);
  });
});
