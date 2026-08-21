import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
});
