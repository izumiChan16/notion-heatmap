import 'server-only';
import { AppError } from '@/lib/errors';

type ServerEnvName = 'NOTION_TOKEN' | 'CONFIG_SECRET' | 'ADMIN_KEY' | 'NEXT_PUBLIC_APP_URL';

function requireEnv(name: ServerEnvName): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new AppError('ENV_MISSING', 500, 'The server is missing required configuration.');
  }
  return value;
}

export function getServerEnv() {
  return {
    notionToken: requireEnv('NOTION_TOKEN'),
    configSecret: requireEnv('CONFIG_SECRET'),
    adminKey: requireEnv('ADMIN_KEY'),
    appUrl: requireEnv('NEXT_PUBLIC_APP_URL').replace(/\/$/, ''),
  };
}
