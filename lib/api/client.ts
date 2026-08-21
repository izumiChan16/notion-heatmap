import type { ApiClient, ApiErrorPayload } from '@/types/api';
import { ApiClientError } from './client-error';
import { mockApiClient } from './mock';

type DataMode = 'mock' | 'api';

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (!value || typeof value !== 'object' || !('error' in value)) return false;
  const error = (value as { error?: unknown }).error;
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      'message' in error &&
      typeof (error as { code: unknown }).code === 'string' &&
      typeof (error as { message: unknown }).message === 'string',
  );
}

async function requestJson<T>(url: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiClientError('NETWORK_ERROR', 'Unable to reach the server. Check your connection.');
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (isApiErrorPayload(payload)) {
      throw new ApiClientError(payload.error.code, payload.error.message);
    }
    throw new ApiClientError('REQUEST_FAILED', 'The server could not complete this request.');
  }

  return payload as T;
}

export const realApiClient: ApiClient = {
  fetchSchema(adminKey, databaseUrl) {
    return requestJson('/api/schema', { adminKey, databaseUrl });
  },
  signConfig(adminKey, config) {
    return requestJson('/api/config/sign', { adminKey, config });
  },
  fetchHeatmap(config, sig, view) {
    return requestJson('/api/heatmap', { config, sig, view });
  },
};

export function createApiClient(mode: DataMode): ApiClient {
  return mode === 'api' ? realApiClient : mockApiClient;
}

const configuredMode: DataMode = process.env.NEXT_PUBLIC_DATA_MODE === 'api' ? 'api' : 'mock';
export const apiClient = createApiClient(configuredMode);
export const dataMode = configuredMode;
