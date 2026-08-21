import styles from './Heatmap.module.css';

export function HeatmapLegend() {
  return (
    <div className={styles.legend} aria-label="Heatmap intensity legend">
      <span>Less</span>
      {[0, 1, 2, 3, 4].map((level) => (
        <span
          aria-label={`Intensity ${level}`}
          className={`${styles.legendCell} ${styles[`level${level}`]}`}
          key={level}
        />
      ))}
      <span>More</span>
    </div>
  );
}
