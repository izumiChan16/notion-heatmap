'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Heatmap, HeatmapSkeleton } from '@/components/Heatmap/Heatmap';
import { apiClient, dataMode } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/client-error';
import { decodePublicConfig } from '@/lib/config/public';
import type { HeatmapView, ViewMode } from '@/types/config';
import type { HeatmapResponse } from '@/types/heatmap';
import styles from './embed.module.css';

type Appearance = 'auto' | 'light' | 'dark';

export function parseAppearance(value: string | null): Appearance {
  return value === 'light' || value === 'dark' ? value : 'auto';
}

function appearanceClass(appearance: Appearance): string {
  if (appearance === 'light') return styles.appearanceLight;
  if (appearance === 'dark') return styles.appearanceDark;
  return styles.appearanceAuto;
}

function RefreshIcon() {
  return (
    <svg aria-hidden="true" height="14" viewBox="0 0 16 16" width="14">
      <path d="M13 5.5A5.5 5.5 0 1 0 13.2 10M13 2v3.5H9.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EmbedClient() {
  const searchParams = useSearchParams();
  const configParam = searchParams.get('config') ?? '';
  const sigParam = searchParams.get('sig') ?? '';
  const appearance = parseAppearance(searchParams.get('appearance'));
  const themeClass = appearanceClass(appearance);
  const decodedConfig = useMemo(() => decodePublicConfig(configParam), [configParam]);
  const defaultView = decodedConfig?.display;
  const [mode, setMode] = useState<ViewMode>(defaultView?.mode ?? 'rollingYear');
  const [year, setYear] = useState<number | null>(defaultView?.year ?? null);
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const validLink = Boolean(configParam && sigParam && decodedConfig);
  const databaseName = decodedConfig?.sources[0]?.databaseName ?? 'Annual activity';

  const load = useCallback(
    async (view: HeatmapView, refresh = false) => {
      if (!validLink) {
        setLoading(false);
        return;
      }
      setError('');
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await apiClient.fetchHeatmap(configParam, sigParam, view);
        setData(response);
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [configParam, sigParam, validLink],
  );

  useEffect(() => {
    const initialMode = defaultView?.mode ?? 'rollingYear';
    const initialYear = defaultView?.year ?? null;
    // URL query parameters are the external source that initializes the signed embed request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load({ mode: initialMode, year: initialMode === 'calendarYear' ? initialYear : null });
  }, [defaultView?.mode, defaultView?.year, load]);

  function handleViewChange(value: string) {
    if (value === 'rollingYear') {
      setMode('rollingYear');
      setYear(null);
      void load({ mode: 'rollingYear', year: null });
      return;
    }
    const selectedYear = Number(value.replace('year:', ''));
    setMode('calendarYear');
    setYear(selectedYear);
    void load({ mode: 'calendarYear', year: selectedYear });
  }

  if (!validLink) {
    return (
      <main
        className={`${styles.centeredState} ${themeClass}`}
        data-appearance={appearance}
      >
        <div className={styles.stateMark}>×</div>
        <h1>Invalid embed link</h1>
        <p>Generate a new signed URL from the setup page.</p>
      </main>
    );
  }

  return (
    <main className={`${styles.page} ${themeClass}`} data-appearance={appearance}>
      <section className={styles.widget}>
        <header className={styles.header}>
          <div className={styles.identity}>
            <span className={styles.brandMark} aria-hidden="true" />
            <div>
              <p>{databaseName}</p>
              <span>{dataMode === 'mock' ? 'DEMO DATA' : 'NOTION ACTIVITY'}</span>
            </div>
          </div>
          <div className={styles.controls}>
            <label>
              <span className={styles.srOnly}>Date range</span>
              <select
                aria-label="Date range"
                disabled={loading || refreshing}
                onChange={(event) => handleViewChange(event.target.value)}
                value={mode === 'rollingYear' ? 'rollingYear' : `year:${year}`}
              >
                <option value="rollingYear">Past year</option>
                {(data?.availableYears ?? (year ? [year] : [])).map((availableYear) => (
                  <option key={availableYear} value={`year:${availableYear}`}>{availableYear}</option>
                ))}
              </select>
            </label>
            <button
              aria-label="Refresh heatmap"
              className={refreshing ? styles.refreshing : ''}
              disabled={loading || refreshing}
              onClick={() => void load({ mode, year: mode === 'calendarYear' ? year : null }, true)}
              title="Refresh"
              type="button"
            >
              <RefreshIcon />
            </button>
          </div>
        </header>

        <div className={styles.content}>
          {loading && !data ? (
            <HeatmapSkeleton />
          ) : error && !data ? (
            <div className={styles.errorState} role="alert">
              <span>Unable to load activity</span>
              <p>{error}</p>
              <button onClick={() => void load({ mode, year }, true)} type="button">Try again</button>
            </div>
          ) : data ? (
            <>
              {error && <div className={styles.inlineError} role="alert">{error}</div>}
              <div className={refreshing ? styles.refreshDim : ''}>
                <Heatmap dateCounts={data.dateCounts} range={data.range} stats={data.stats} />
              </div>
              {data.stats.total === 0 && (
                <p className={styles.emptyNote}>No matching activity in this range. The complete year remains visible.</p>
              )}
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
