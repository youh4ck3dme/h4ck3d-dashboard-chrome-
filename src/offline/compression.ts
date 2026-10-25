/** Optional portable backup format. This does not alter third-party API requests. */
export async function encodeBackup(
  value: unknown,
  compress = true,
): Promise<{ blob: Blob; rawBytes: number; storedBytes: number; encoding: 'gzip' | 'identity' }> {
  const json = JSON.stringify({ schemaVersion: 1, data: value });
  const raw = new Blob([json], { type: 'application/json' });
  if (compress && typeof CompressionStream !== 'undefined') {
    const blob = await new Response(raw.stream().pipeThrough(new CompressionStream('gzip'))).blob();
    return { blob, rawBytes: raw.size, storedBytes: blob.size, encoding: 'gzip' };
  }
  return { blob: raw, rawBytes: raw.size, storedBytes: raw.size, encoding: 'identity' };
}
