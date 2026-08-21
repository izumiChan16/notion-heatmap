import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SetupForm } from './SetupForm';

describe('SetupForm', () => {
  it('connects to mock schema, previews data, and generates an embed URL', async () => {
    const user = userEvent.setup();
    render(<SetupForm />);

    await user.type(screen.getByLabelText('Admin key'), 'local-admin-key');
    await user.type(screen.getByLabelText('Notion database URL or ID'), 'https://notion.so/mock-database');
    await user.click(screen.getByRole('button', { name: 'Test connection' }));

    expect(await screen.findAllByText('Daily Practice Log')).toHaveLength(2);
    await user.selectOptions(screen.getByLabelText('Date property'), 'Date');
    await user.click(screen.getByRole('button', { name: /Add filter condition/i }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    expect(await screen.findByLabelText('Annual activity heatmap')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Generate embed URL' }));

    await waitFor(() => {
      const input = screen.getByLabelText<HTMLInputElement>('Generated embed URL');
      expect(input.value).toContain('/embed?config=mock.');
    });
  });

  it('shows an actionable error for a rejected admin key', async () => {
    const user = userEvent.setup();
    render(<SetupForm />);
    await user.type(screen.getByLabelText('Admin key'), 'wrong');
    await user.type(screen.getByLabelText('Notion database URL or ID'), 'database-id');
    await user.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The admin key is incorrect.');
  });
});
