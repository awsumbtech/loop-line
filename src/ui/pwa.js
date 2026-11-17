// Offline support for the installed app, where the browser allows it.
export function registerServiceWorker() {
  try {
    const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || local)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  } catch (e) { /* not available here */ }
}
