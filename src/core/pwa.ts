/** Registers the service worker in production builds so the game works offline after the first visit. */
export async function registerPwa(): Promise<void> {
  if (import.meta.env.DEV) return;
  if (!('serviceWorker' in navigator)) return;
  try {
    const { registerSW } = await import('virtual:pwa-register');
    registerSW({
      immediate: true,
      onOfflineReady() {
        console.info('[pwa] ready to play offline');
      },
    });
  } catch (err) {
    console.warn('[pwa] service worker registration failed', err);
  }
}
