import type { HeatmapConfig } from '@/types/config';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function encodePublicConfig(config: HeatmapConfig): string {
  const bytes = new TextEncoder().encode(JSON.stringify(config));
  return bytesToBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function decodePublicConfig(encoded: string): HeatmapConfig | null {
  try {
    const value = encoded.startsWith('mock.') ? encoded.slice(5) : encoded;
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as HeatmapConfig;
  } catch {
    return null;
  }
}
