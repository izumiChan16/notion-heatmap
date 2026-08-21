'use client';

import { useMemo, useState } from 'react';
import { Heatmap } from '@/components/Heatmap/Heatmap';
import { apiClient, dataMode } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/client-error';
import type { FilterProperty, SchemaResponse } from '@/types/api';
import type { FilterType, HeatmapConfig, SourceFilter, ViewMode } from '@/types/config';
import type { HeatmapResponse } from '@/types/heatmap';
import styles from './SetupForm.module.css';

type DraftFilter = {
  id: number;
  property: string;
  type: FilterType | '';
  values: string[];
  checked: boolean;
};

const timezones = ['Asia/Taipei', 'UTC', 'Asia/Tokyo', 'America/Los_Angeles', 'Europe/London'];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" height="14" viewBox="0 0 16 16" width="14">
      <path d="M3 8h9m-3.5-3.5L12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg aria-hidden="true" height="14" viewBox="0 0 16 16" width="14">
      <path d="M13 5.5A5.5 5.5 0 1 0 13.2 10M13 2v3.5H9.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" height="14" viewBox="0 0 16 16" width="14">
      <rect fill="none" height="9" rx="1.5" stroke="currentColor" width="9" x="5" y="5" />
      <path d="M3 11H2.5A1.5 1.5 0 0 1 1 9.5v-7A1.5 1.5 0 0 1 2.5 1h7A1.5 1.5 0 0 1 11 2.5V3" fill="none" stroke="currentColor" />
    </svg>
  );
}

export function SetupForm() {
  const currentYear = new Date().getFullYear();
  const [adminKey, setAdminKey] = useState('');
  const [databaseUrl, setDatabaseUrl] = useState('');
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [dateProperty, setDateProperty] = useState('');
  const [filters, setFilters] = useState<DraftFilter[]>([]);
  const [nextFilterId, setNextFilterId] = useState(1);
  const [mode, setMode] = useState<ViewMode>('rollingYear');
  const [year, setYear] = useState(currentYear);
  const [timezone, setTimezone] = useState('Asia/Taipei');
  const [preview, setPreview] = useState<HeatmapResponse | null>(null);
  const [embedUrl, setEmbedUrl] = useState('');
  const [signedFingerprint, setSignedFingerprint] = useState('');
  const [showGeneratedLink, setShowGeneratedLink] = useState(false);
  const [busy, setBusy] = useState<'schema' | 'preview' | 'generate' | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const sourceFilters = useMemo<SourceFilter[]>(
    () =>
      filters
        .filter((filter) => filter.property && filter.type)
        .map((filter) => ({
          property: filter.property,
          type: filter.type as FilterType,
          value: filter.type === 'checkbox' ? filter.checked : filter.values,
        })),
    [filters],
  );

  const config = useMemo<HeatmapConfig | null>(() => {
    if (!schema || !dateProperty) return null;
    return {
      version: 1,
      sources: [
        {
          databaseId: schema.databaseId,
          databaseUrl,
          databaseName: schema.databaseName,
          dateProperty,
          filters: sourceFilters,
        },
      ],
      display: {
        mode,
        ...(mode === 'calendarYear' ? { year } : {}),
        theme: 'github',
      },
      timezone,
    };
  }, [schema, dateProperty, databaseUrl, sourceFilters, mode, year, timezone]);

  const fingerprint = config ? JSON.stringify(config) : '';
  const isStale = Boolean(signedFingerprint && signedFingerprint !== fingerprint);
  const usedProperties = new Set(filters.map((filter) => filter.property).filter(Boolean));
  const canAddFilter = Boolean(
    schema && schema.filterProperties.some((property) => !usedProperties.has(property.name)),
  );

  async function handleConnect() {
    setError('');
    setBusy('schema');
    setSchema(null);
    setPreview(null);
    setShowGeneratedLink(false);
    try {
      const response = await apiClient.fetchSchema(adminKey, databaseUrl);
      setSchema(response);
      setDateProperty(response.dateProperties.length === 1 ? response.dateProperties[0].name : '');
      setFilters([]);
    } catch (connectError) {
      setError(getErrorMessage(connectError));
    } finally {
      setBusy(null);
    }
  }

  function addFilter() {
    if (!schema) return;
    const property = schema.filterProperties.find((item) => !usedProperties.has(item.name));
    if (!property) return;
    setFilters((current) => [
      ...current,
      {
        id: nextFilterId,
        property: property.name,
        type: property.type,
        values: [],
        checked: true,
      },
    ]);
    setNextFilterId((value) => value + 1);
  }

  function updateFilterProperty(id: number, propertyName: string) {
    const property = schema?.filterProperties.find((item) => item.name === propertyName);
    if (!property) return;
    setFilters((current) =>
      current.map((filter) =>
        filter.id === id
          ? { ...filter, property: property.name, type: property.type, values: [], checked: true }
          : filter,
      ),
    );
  }

  function toggleFilterValue(id: number, value: string) {
    setFilters((current) =>
      current.map((filter) => {
        if (filter.id !== id) return filter;
        const hasValue = filter.values.includes(value);
        return {
          ...filter,
          values: hasValue ? filter.values.filter((item) => item !== value) : [...filter.values, value],
        };
      }),
    );
  }

  function getProperty(filter: DraftFilter): FilterProperty | undefined {
    return schema?.filterProperties.find((property) => property.name === filter.property);
  }

  function validateConfig(): boolean {
    setError('');
    if (!config) {
      setError('Connect a database and choose a date property first.');
      return false;
    }
    const incomplete = filters.some(
      (filter) => filter.type !== 'checkbox' && filter.values.length === 0,
    );
    if (incomplete) {
      setError('Choose at least one value for every filter condition.');
      return false;
    }
    if (!timezone.trim()) {
      setError('Enter an IANA timezone, such as Asia/Taipei.');
      return false;
    }
    return true;
  }

  async function getSignedUrl(): Promise<string> {
    if (!config) throw new Error('Configuration is incomplete.');
    if (embedUrl && signedFingerprint === fingerprint) return embedUrl;
    const signed = await apiClient.signConfig(adminKey, config);
    setEmbedUrl(signed.embedUrl);
    setSignedFingerprint(fingerprint);
    return signed.embedUrl;
  }

  async function handlePreview() {
    if (!validateConfig()) return;
    setBusy('preview');
    setError('');
    setCopied(false);
    try {
      const signedUrl = await getSignedUrl();
      const parsed = new URL(signedUrl, window.location.origin);
      const encodedConfig = parsed.searchParams.get('config');
      const signature = parsed.searchParams.get('sig');
      if (!encodedConfig || !signature) throw new Error('The signing response did not include a valid embed URL.');
      const response = await apiClient.fetchHeatmap(encodedConfig, signature, {
        mode,
        year: mode === 'calendarYear' ? year : null,
      });
      setPreview(response);
    } catch (previewError) {
      setError(getErrorMessage(previewError));
    } finally {
      setBusy(null);
    }
  }

  async function handleGenerate() {
    if (!validateConfig()) return;
    setBusy('generate');
    setError('');
    setCopied(false);
    try {
      await getSignedUrl();
      setShowGeneratedLink(true);
    } catch (generateError) {
      setError(getErrorMessage(generateError));
    } finally {
      setBusy(null);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(embedUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Copy failed. Select the URL and copy it manually.');
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>NOTION HEATMAP / SETUP</p>
          <h1>Turn quiet progress<br />into a visible year.</h1>
        </div>
        <div className={styles.heroNote}>
          <span className={styles.modeDot} />
          <span>{dataMode === 'mock' ? 'Mock data mode' : 'Live API mode'}</span>
        </div>
      </header>

      <div className={styles.workspace}>
        <section className={styles.formPanel} aria-label="Heatmap configuration">
          <div className={styles.step}>
            <div className={styles.stepHeading}>
              <span>01</span>
              <div>
                <h2>Connect a database</h2>
                <p>Your admin key is sent only to protected server endpoints.</p>
              </div>
            </div>
            <div className={styles.fields}>
              <label className={styles.field}>
                <span>Admin key</span>
                <input
                  autoComplete="off"
                  onChange={(event) => setAdminKey(event.target.value)}
                  placeholder="Enter your ADMIN_KEY"
                  type="password"
                  value={adminKey}
                />
              </label>
              <label className={styles.field}>
                <span>Notion database URL or ID</span>
                <input
                  onChange={(event) => setDatabaseUrl(event.target.value)}
                  placeholder="https://notion.so/..."
                  type="text"
                  value={databaseUrl}
                />
              </label>
              <button
                className={styles.secondaryButton}
                disabled={busy !== null || !adminKey.trim() || !databaseUrl.trim()}
                onClick={handleConnect}
                type="button"
              >
                {busy === 'schema' ? <span className={styles.spinner} /> : <ArrowIcon />}
                {busy === 'schema' ? 'Connecting…' : 'Test connection'}
              </button>
            </div>
            {schema && (
              <div className={styles.connectionCard}>
                <span className={styles.successMark}>✓</span>
                <div>
                  <strong>{schema.databaseName}</strong>
                  <small>{schema.databaseId}</small>
                </div>
                <span>{schema.dateProperties.length} date fields</span>
              </div>
            )}
          </div>

          <div className={`${styles.step} ${!schema ? styles.disabledStep : ''}`}>
            <div className={styles.stepHeading}>
              <span>02</span>
              <div>
                <h2>Shape the activity</h2>
                <p>Pick the date source and narrow the records that count.</p>
              </div>
            </div>
            {schema && schema.dateProperties.length === 0 ? (
              <div className={styles.notice}>This database has no date property. Add one in Notion and reconnect.</div>
            ) : (
              <div className={styles.fields}>
                <label className={styles.field}>
                  <span>Date property</span>
                  <select
                    disabled={!schema}
                    onChange={(event) => setDateProperty(event.target.value)}
                    value={dateProperty}
                  >
                    <option value="">Choose a date property</option>
                    {schema?.dateProperties.map((property) => (
                      <option key={property.name} value={property.name}>{property.name}</option>
                    ))}
                  </select>
                </label>

                {filters.map((filter, index) => {
                  const property = getProperty(filter);
                  return (
                    <div className={styles.filterCard} key={filter.id}>
                      <div className={styles.filterHeader}>
                        <span>Condition {index + 1}</span>
                        <button
                          aria-label={`Remove condition ${index + 1}`}
                          onClick={() => setFilters((current) => current.filter((item) => item.id !== filter.id))}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                      <select
                        aria-label={`Filter property ${index + 1}`}
                        onChange={(event) => updateFilterProperty(filter.id, event.target.value)}
                        value={filter.property}
                      >
                        {schema?.filterProperties.map((option) => (
                          <option
                            disabled={usedProperties.has(option.name) && option.name !== filter.property}
                            key={option.name}
                            value={option.name}
                          >
                            {option.name} · {option.type.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                      {filter.type === 'checkbox' ? (
                        <div className={styles.segmented} aria-label={`${filter.property} value`}>
                          <button
                            aria-pressed={filter.checked}
                            className={filter.checked ? styles.activeSegment : ''}
                            onClick={() => setFilters((current) => current.map((item) => item.id === filter.id ? { ...item, checked: true } : item))}
                            type="button"
                          >Checked</button>
                          <button
                            aria-pressed={!filter.checked}
                            className={!filter.checked ? styles.activeSegment : ''}
                            onClick={() => setFilters((current) => current.map((item) => item.id === filter.id ? { ...item, checked: false } : item))}
                            type="button"
                          >Unchecked</button>
                        </div>
                      ) : (
                        <div className={styles.optionList}>
                          {property?.options?.map((option) => (
                            <button
                              aria-pressed={filter.values.includes(option)}
                              className={filter.values.includes(option) ? styles.selectedOption : ''}
                              key={option}
                              onClick={() => toggleFilterValue(filter.id, option)}
                              type="button"
                            >
                              <span />{option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  className={styles.textButton}
                  disabled={!canAddFilter}
                  onClick={addFilter}
                  type="button"
                >
                  <span>＋</span> Add filter condition
                </button>
              </div>
            )}
          </div>

          <div className={`${styles.step} ${!schema ? styles.disabledStep : ''}`}>
            <div className={styles.stepHeading}>
              <span>03</span>
              <div>
                <h2>Set the default view</h2>
                <p>The embed can still switch between available years.</p>
              </div>
            </div>
            <div className={styles.fields}>
              <div className={styles.field}>
                <span>Display mode</span>
                <div className={styles.segmented}>
                  <button
                    aria-pressed={mode === 'rollingYear'}
                    className={mode === 'rollingYear' ? styles.activeSegment : ''}
                    disabled={!schema}
                    onClick={() => setMode('rollingYear')}
                    type="button"
                  >Past year</button>
                  <button
                    aria-pressed={mode === 'calendarYear'}
                    className={mode === 'calendarYear' ? styles.activeSegment : ''}
                    disabled={!schema}
                    onClick={() => setMode('calendarYear')}
                    type="button"
                  >Calendar year</button>
                </div>
              </div>
              {mode === 'calendarYear' && (
                <label className={styles.field}>
                  <span>Year</span>
                  <input
                    disabled={!schema}
                    max={currentYear + 1}
                    min={1970}
                    onChange={(event) => setYear(Number(event.target.value))}
                    type="number"
                    value={year}
                  />
                </label>
              )}
              <label className={styles.field}>
                <span>Timezone</span>
                <input
                  disabled={!schema}
                  list="timezone-options"
                  onChange={(event) => setTimezone(event.target.value)}
                  type="text"
                  value={timezone}
                />
                <datalist id="timezone-options">
                  {timezones.map((item) => <option key={item} value={item} />)}
                </datalist>
              </label>
            </div>
          </div>

          {error && <div className={styles.error} role="alert"><span>!</span>{error}</div>}

          <div className={styles.actions}>
            <button
              className={styles.secondaryButton}
              disabled={busy !== null || !config}
              onClick={handlePreview}
              type="button"
            >
              {busy === 'preview' ? <span className={styles.spinner} /> : <RefreshIcon />}
              {busy === 'preview' ? 'Loading preview…' : 'Preview'}
            </button>
            <button
              className={styles.primaryButton}
              disabled={busy !== null || !config}
              onClick={handleGenerate}
              type="button"
            >
              {busy === 'generate' ? <span className={styles.spinnerLight} /> : <ArrowIcon />}
              {busy === 'generate' ? 'Generating…' : 'Generate embed URL'}
            </button>
          </div>

          {showGeneratedLink && embedUrl && (
            <div className={`${styles.generated} ${isStale ? styles.generatedStale : ''}`}>
              <div>
                <span>{isStale ? 'Configuration changed' : 'Embed URL ready'}</span>
                <p>{isStale ? 'Generate again to include the latest settings.' : 'Paste this link into a Notion /embed block.'}</p>
              </div>
              <div className={styles.urlRow}>
                <input aria-label="Generated embed URL" readOnly value={embedUrl} />
                <button disabled={isStale} onClick={handleCopy} type="button">
                  <CopyIcon />{copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className={styles.previewPanel}>
          <div className={styles.previewTopline}>
            <span>LIVE PREVIEW</span>
            {isStale && <em>Out of date</em>}
          </div>
          <div className={styles.previewFrame}>
            <div className={styles.previewToolbar}>
              <div>
                <span className={styles.previewMark} />
                <strong>{schema?.databaseName ?? 'Annual activity'}</strong>
              </div>
              <span>{mode === 'rollingYear' ? 'Past year' : year}</span>
            </div>
            {preview ? (
              <Heatmap
                dateCounts={preview.dateCounts}
                loading={busy === 'preview'}
                range={preview.range}
                stats={preview.stats}
              />
            ) : (
              <div className={styles.previewEmpty}>
                <div className={styles.previewPattern} aria-hidden="true">
                  {Array.from({ length: 56 }, (_, index) => <span key={index} />)}
                </div>
                <strong>Your year will appear here.</strong>
                <p>Connect a database, shape the data, then run a signed preview.</p>
              </div>
            )}
          </div>
          <p className={styles.previewFootnote}>Preview follows the same signed request flow as the final embed.</p>
        </aside>
      </div>
    </main>
  );
}
