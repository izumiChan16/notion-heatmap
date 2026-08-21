import type { HeatmapStats as HeatmapStatsType } from '@/types/heatmap';
import styles from './Heatmap.module.css';

type HeatmapStatsProps = {
  stats: HeatmapStatsType;
};

const items: Array<{ key: keyof HeatmapStatsType; label: string }> = [
  { key: 'total', label: 'Records' },
  { key: 'activeDays', label: 'Active days' },
  { key: 'longestStreak', label: 'Longest streak' },
  { key: 'currentStreak', label: 'Current streak' },
];

export function HeatmapStats({ stats }: HeatmapStatsProps) {
  return (
    <dl className={styles.stats}>
      {items.map(({ key, label }) => (
        <div className={styles.stat} key={key}>
          <dt>{label}</dt>
          <dd>
            {stats[key].toLocaleString('en-US')}
            {key.includes('Streak') && <span> days</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
