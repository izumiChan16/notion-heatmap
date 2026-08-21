import 'server-only';
import { Client } from '@notionhq/client';
import { getServerEnv } from '@/lib/env';

export function createNotionClient() {
  return new Client({
    auth: getServerEnv().notionToken,
    timeoutMs: 15_000,
    retry: { maxRetries: 2 },
  });
}
