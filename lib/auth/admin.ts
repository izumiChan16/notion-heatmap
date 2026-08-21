import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import { getServerEnv } from '@/lib/env';
import { AppError } from '@/lib/errors';

export function safeEqualText(left: string, right: string): boolean {
  const leftDigest = createHash('sha256').update(left).digest();
  const rightDigest = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export function assertAdminKey(input: unknown): asserts input is string {
  if (typeof input !== 'string' || !safeEqualText(input, getServerEnv().adminKey)) {
    throw new AppError('ADMIN_KEY_INVALID', 401, 'The admin key is incorrect.');
  }
}
