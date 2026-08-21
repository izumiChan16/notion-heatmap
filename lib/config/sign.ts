import 'server-only';
import { createHmac } from 'node:crypto';
import { safeEqualText } from '@/lib/auth/admin';
import { getServerEnv } from '@/lib/env';
import { AppError } from '@/lib/errors';
import type { HeatmapConfig } from '@/types/config';
import { validateConfig } from './validate';

export const MAX_ENCODED_CONFIG_LENGTH = 16_384;

export function encodeConfig(config: HeatmapConfig): string {
  return Buffer.from(JSON.stringify(config), 'utf8').toString('base64url');
}

export function signEncodedConfig(encodedConfig: string): string {
  return createHmac('sha256', getServerEnv().configSecret)
    .update(encodedConfig, 'utf8')
    .digest('base64url');
}

export function verifyEncodedConfig(encodedConfig: string, signature: string): boolean {
  return safeEqualText(signEncodedConfig(encodedConfig), signature);
}

export function decodeAndValidateConfig(encodedConfig: string): HeatmapConfig {
  if (!encodedConfig || encodedConfig.length > MAX_ENCODED_CONFIG_LENGTH) {
    throw new AppError('CONFIG_INVALID', 400, 'The configuration is invalid.');
  }

  try {
    const json = Buffer.from(encodedConfig, 'base64url').toString('utf8');
    return validateConfig(JSON.parse(json) as unknown);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('CONFIG_INVALID', 400, 'The configuration is invalid.');
  }
}
