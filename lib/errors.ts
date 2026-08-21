import { NextResponse } from 'next/server';

export type AppErrorCode =
  | 'ADMIN_KEY_INVALID'
  | 'ENV_MISSING'
  | 'NOTION_UNAUTHORIZED'
  | 'DATABASE_INVALID'
  | 'DATABASE_NO_DATE_FIELD'
  | 'CONFIG_INVALID'
  | 'CONFIG_SIGNATURE_INVALID'
  | 'NOTION_QUERY_FAILED'
  | 'TIMEOUT';

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  // Deliberately do not log request bodies, signed config values, or Notion responses.
  console.error('Unhandled server error', error instanceof Error ? error.name : 'UnknownError');
  return NextResponse.json(
    {
      error: {
        code: 'NOTION_QUERY_FAILED',
        message: 'The server could not complete this request.',
      },
    },
    { status: 500 },
  );
}
