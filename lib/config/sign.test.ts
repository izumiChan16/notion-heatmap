import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@/lib/errors';
import { validConfig } from './validate.test';

vi.mock('@/lib/env', () => ({
  getServerEnv: () => ({ configSecret: 'test-signing-secret' }),
}));

import { decodeAndValidateConfig, encodeConfig, signEncodedConfig, verifyEncodedConfig } from './sign';

afterEach(() => vi.clearAllMocks());

describe('signed config', () => {
  it('round trips Unicode config and verifies its deterministic signature', () => {
    const encoded = encodeConfig(validConfig);
    const signature = signEncodedConfig(encoded);

    expect(encoded).not.toMatch(/[+/=]/);
    expect(decodeAndValidateConfig(encoded)).toEqual(validConfig);
    expect(signEncodedConfig(encoded)).toBe(signature);
    expect(verifyEncodedConfig(encoded, signature)).toBe(true);
  });

  it('rejects tampered config or signature', () => {
    const encoded = encodeConfig(validConfig);
    const signature = signEncodedConfig(encoded);

    expect(verifyEncodedConfig(`${encoded}x`, signature)).toBe(false);
    expect(verifyEncodedConfig(encoded, `${signature}x`)).toBe(false);
  });

  it('rejects invalid encoded content', () => {
    expect(() => decodeAndValidateConfig('definitely-not-json')).toThrow(AppError);
  });
});
