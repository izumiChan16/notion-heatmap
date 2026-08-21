import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api/client';
import { encodePublicConfig } from '@/lib/config/public';
import type { HeatmapConfig } from '@/types/config';
import { EmbedClient } from './EmbedClient';

let params = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => params,
}));

const config: HeatmapConfig = {
  version: 1,
  sources: [{ databaseId: 'abc', databaseName: 'Writing log', dateProperty: 'Date', filters: [] }],
  display: { mode: 'rollingYear', theme: 'github' },
  timezone: 'Asia/Taipei',
};

describe('EmbedClient', () => {
  beforeEach(() => {
    params = new URLSearchParams();
  });

  it.each([
    [null, 'auto'],
    ['auto', 'auto'],
    ['sepia', 'auto'],
    ['light', 'light'],
    ['dark', 'dark'],
  ])('normalizes appearance %s to %s', (input, expected) => {
    if (input) params.set('appearance', input);
    const { container } = render(<EmbedClient />);
    expect(container.firstElementChild).toHaveAttribute('data-appearance', expected);
  });

  it('shows a compact invalid-link state when signed params are missing', () => {
    render(<EmbedClient />);
    expect(screen.getByRole('heading', { name: 'Invalid embed link' })).toBeInTheDocument();
  });

  it('loads mock data and switches calendar years', async () => {
    const user = userEvent.setup();
    params = new URLSearchParams({
      config: `mock.${encodePublicConfig(config)}`,
      sig: 'mock-signature',
    });
    render(<EmbedClient />);

    expect(await screen.findByLabelText('Annual activity heatmap')).toBeInTheDocument();
    expect(screen.getByText('Writing log')).toBeInTheDocument();

    const yearOption = await screen.findByRole('option', { name: String(new Date().getUTCFullYear()) });
    await user.selectOptions(screen.getByLabelText('Date range'), yearOption);
    expect(await screen.findByLabelText('Annual activity heatmap')).toBeInTheDocument();
  });

  it('keeps appearance out of heatmap API requests', async () => {
    const fetchHeatmap = vi.spyOn(apiClient, 'fetchHeatmap');
    const encodedConfig = `mock.${encodePublicConfig(config)}`;
    params = new URLSearchParams({
      config: encodedConfig,
      sig: 'mock-signature',
      appearance: 'dark',
    });

    render(<EmbedClient />);
    await screen.findByLabelText('Annual activity heatmap');

    expect(fetchHeatmap).toHaveBeenCalledWith(encodedConfig, 'mock-signature', {
      mode: 'rollingYear',
      year: null,
    });
  });
});
