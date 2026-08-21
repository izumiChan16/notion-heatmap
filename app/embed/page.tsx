import { Suspense } from 'react';
import { HeatmapSkeleton } from '@/components/Heatmap/Heatmap';
import { EmbedClient } from './EmbedClient';
import styles from './embed.module.css';

export default function EmbedPage() {
  return (
    <Suspense
      fallback={
        <main className={`${styles.page} ${styles.appearanceAuto}`} data-appearance="auto">
          <section className={styles.widget}><HeatmapSkeleton /></section>
        </main>
      }
    >
      <EmbedClient />
    </Suspense>
  );
}
