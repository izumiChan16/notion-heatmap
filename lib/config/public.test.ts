import { describe, expect, it } from 'vitest';
import { decodePublicConfig, encodePublicConfig } from './public';
import type { HeatmapConfig } from '@/types/config';

const config: HeatmapConfig = {
  version: 1,
  sources: [
    {
      databaseId: 'abc',
      databaseName: '学习记录',
      dateProperty: '完成日期',
      filters: [],
    },
  ],
  display: { mode: 'rollingYear', theme: 'github' },
  timezone: 'Asia/Taipei',
};

describe('public config encoding', () => {
  it('round trips unicode config through Base64URL', () => {
    const encoded = encodePublicConfig(config);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(decodePublicConfig(encoded)).toEqual(config);
    expect(decodePublicConfig(`mock.${encoded}`)).toEqual(config);
  });

  it('returns null for invalid input', () => {
    expect(decodePublicConfig('not-json')).toBeNull();
  });
});
