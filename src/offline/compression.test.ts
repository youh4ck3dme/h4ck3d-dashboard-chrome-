// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { encodeBackup } from './compression';

describe('portable backup compression', () => {
  it('roundtrips gzip and measures bytes without claiming API bandwidth savings', async () => {
    const payload = {
      projects: Array.from({ length: 100 }, (_, i) => ({
        id: `p-${i}`,
        name: 'Project timeline sample',
        tech: ['React', 'TypeScript'],
      })),
    };
    const encoded = await encodeBackup(payload);
    expect(encoded.encoding).toBe('gzip');
    expect(encoded.storedBytes).toBeLessThan(encoded.rawBytes / 2);
    const decoded = await new Response(
      encoded.blob.stream().pipeThrough(new DecompressionStream('gzip')),
    ).json();
    expect(decoded).toEqual({ schemaVersion: 1, data: payload });
    console.warn(
      `Backup measurement: ${encoded.rawBytes} -> ${encoded.storedBytes} bytes (gzip file, not API traffic)`,
    );
  });
  it('preserves data when compression is unavailable', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    try {
      const encoded = await encodeBackup({ example: true });
      expect(encoded.encoding).toBe('identity');
      expect(await encoded.blob.text()).toContain('example');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
