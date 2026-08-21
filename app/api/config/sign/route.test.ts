import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertAdminKey: vi.fn(),
  validateConfig: vi.fn((value) => value),
  encodeConfig: vi.fn(() => 'encoded-config'),
  signEncodedConfig: vi.fn(() => 'signature'),
  getServerEnv: vi.fn(() => ({ appUrl: 'https://heatmap.example' })),
}));

vi.mock('@/lib/auth/admin', () => ({ assertAdminKey: mocks.assertAdminKey }));
vi.mock('@/lib/config/validate', () => ({ validateConfig: mocks.validateConfig }));
vi.mock('@/lib/config/sign', () => ({
  encodeConfig: mocks.encodeConfig,
  signEncodedConfig: mocks.signEncodedConfig,
}));
vi.mock('@/lib/env', () => ({ getServerEnv: mocks.getServerEnv }));

import { POST } from './route';

afterEach(() => vi.clearAllMocks());

describe('POST /api/config/sign', () => {
  it('requires the admin key before validating and signing configuration', async () => {
    const config = { version: 1 };
    const response = await POST(
      new Request('http://localhost/api/config/sign', {
        method: 'POST',
        body: JSON.stringify({ adminKey: 'admin', config }),
      }),
    );

    expect(mocks.assertAdminKey).toHaveBeenCalledWith('admin');
    expect(mocks.validateConfig).toHaveBeenCalledWith(config);
    expect(await response.json()).toEqual({
      embedUrl: 'https://heatmap.example/embed?config=encoded-config&sig=signature',
    });
  });
});
