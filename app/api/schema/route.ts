import { NextResponse } from 'next/server';
import { assertAdminKey } from '@/lib/auth/admin';
import { AppError, errorResponse } from '@/lib/errors';
import { createNotionClient } from '@/lib/notion/client';
import { parseDatabaseId } from '@/lib/notion/parseDatabaseId';
import { readDatabaseSchema } from '@/lib/notion/schema';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) throw new AppError('DATABASE_INVALID', 400, 'Invalid request body.');

    assertAdminKey(body.adminKey);
    const databaseId = parseDatabaseId(body.databaseUrl);
    const result = await readDatabaseSchema(createNotionClient(), databaseId);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
