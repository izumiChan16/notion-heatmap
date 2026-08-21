import { NextResponse } from 'next/server';
import { assertAdminKey } from '@/lib/auth/admin';
import { encodeConfig, signEncodedConfig } from '@/lib/config/sign';
import { validateConfig } from '@/lib/config/validate';
import { getServerEnv } from '@/lib/env';
import { AppError, errorResponse } from '@/lib/errors';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) throw new AppError('CONFIG_INVALID', 400, 'Invalid request body.');

    assertAdminKey(body.adminKey);
    const config = validateConfig(body.config);
    const encoded = encodeConfig(config);
    const sig = signEncodedConfig(encoded);
    const embedUrl = `${getServerEnv().appUrl}/embed?config=${encoded}&sig=${sig}`;
    return NextResponse.json({ embedUrl });
  } catch (error) {
    return errorResponse(error);
  }
}
