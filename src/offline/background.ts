export async function requestBackgroundSync(
  registration: { sync?: { register(tag: string): Promise<void> } } | undefined,
): Promise<boolean> {
  if (!registration?.sync) return false;
  try {
    await registration.sync.register('h4ck3d-local-refresh');
    return true;
  } catch {
    return false;
  }
}
