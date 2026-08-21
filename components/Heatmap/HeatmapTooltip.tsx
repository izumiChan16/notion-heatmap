import { formatDateLabel } from '@/lib/heatmap/dates';
import type { HeatmapLevel } from '@/types/heatmap';
import styles from './Heatmap.module.css';

type HeatmapTooltipProps = {
  date: string;
  count: number;
  level: HeatmapLevel;
  edge: 'start' | 'middle' | 'end';
};

export function HeatmapTooltip({ date, count, level, edge }: HeatmapTooltipProps) {
  return (
    <span className={styles.tooltip} data-edge={edge} role="tooltip">
      <strong>{formatDateLabel(date)}</strong>
      <span>{count === 1 ? '1 record' : `${count} records`}</span>
      <span className={styles.tooltipLevel}>Intensity {level}</span>
    </span>
  );
}
