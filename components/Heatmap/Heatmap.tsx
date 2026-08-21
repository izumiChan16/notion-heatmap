import type { CSSProperties } from 'react';
import { buildHeatmapCalendar, formatDateLabel } from '@/lib/heatmap/dates';
import type { HeatmapRange, HeatmapStats as HeatmapStatsType } from '@/types/heatmap';
import { HeatmapLegend } from './HeatmapLegend';
import { HeatmapStats } from './HeatmapStats';
import { HeatmapTooltip } from './HeatmapTooltip';
import styles from './Heatmap.module.css';

type HeatmapProps = {
  range: HeatmapRange;
  dateCounts: Record<string, number>;
  stats: HeatmapStatsType;
  loading?: boolean;
  showStats?: boolean;
};

const WEEKDAY_LABELS = ['Mon', 'Wed', 'Fri'];

export function Heatmap({ range, dateCounts, stats, loading = false, showStats = true }: HeatmapProps) {
  const calendar = buildHeatmapCalendar(range, dateCounts);
  const gridStyle = { '--week-count': calendar.weekCount } as CSSProperties;

  if (loading) return <HeatmapSkeleton showStats={showStats} />;

  return (
    <div className={styles.heatmap}>
      <div className={styles.scroller}>
        <div className={styles.chart} style={gridStyle}>
          <div className={styles.months} aria-hidden="true">
            {calendar.months.map((month) => (
              <span key={`${month.label}-${month.weekIndex}`} style={{ gridColumnStart: month.weekIndex + 1 }}>
                {month.label}
              </span>
            ))}
          </div>

          <div className={styles.weekdays} aria-hidden="true">
            {WEEKDAY_LABELS.map((label, index) => (
              <span key={label} style={{ gridRow: index * 2 + 2 }}>
                {label}
              </span>
            ))}
          </div>

          <div className={styles.grid} aria-label="Annual activity heatmap">
            {calendar.cells.map((cell, index) => {
              if (!cell) return <span aria-hidden="true" className={styles.placeholder} key={`empty-${index}`} />;

              const edge =
                cell.weekIndex < 3
                  ? 'start'
                  : cell.weekIndex >= calendar.weekCount - 3
                    ? 'end'
                    : 'middle';
              const recordLabel = cell.count === 1 ? '1 record' : `${cell.count} records`;

              return (
                <span className={styles.cellWrap} key={cell.date}>
                  <button
                    aria-label={`${formatDateLabel(cell.date)}, ${recordLabel}, intensity ${cell.level}${cell.isFuture ? ', future date' : ''}`}
                    className={`${styles.cell} ${styles[`level${cell.level}`]} ${cell.isFuture ? styles.future : ''}`}
                    data-date={cell.date}
                    type="button"
                  />
                  <HeatmapTooltip date={cell.date} count={cell.count} edge={edge} level={cell.level} />
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.range}>
          {range.start} — {range.end}
        </span>
        <HeatmapLegend />
      </div>
      {showStats && <HeatmapStats stats={stats} />}
    </div>
  );
}

export function HeatmapSkeleton({ showStats = true }: { showStats?: boolean }) {
  return (
    <div aria-label="Loading heatmap" aria-live="polite" className={styles.heatmap} role="status">
      <div className={`${styles.skeletonGrid} ${styles.shimmer}`} />
      <div className={styles.skeletonFooter}>
        <span className={`${styles.skeletonLine} ${styles.shimmer}`} />
        <span className={`${styles.skeletonLineShort} ${styles.shimmer}`} />
      </div>
      {showStats && (
        <div className={styles.skeletonStats}>
          {[0, 1, 2, 3].map((item) => (
            <span className={`${styles.skeletonStat} ${styles.shimmer}`} key={item} />
          ))}
        </div>
      )}
    </div>
  );
}
