/**
 * Browsers hand out endpoints on their vendor's push service. The server posts to
 * whatever is stored, and a signed-in user can write that row, so anything outside
 * these services is refused: the app must never be aimed at another address.
 */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^([a-z0-9-]+\.)*push\.apple\.com$/, /^([a-z0-9-]+\.)*push\.services\.mozilla\.com$/, /^([a-z0-9-]+\.)*notify\.windows\.com$/];

export function isPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
  return PUSH_HOSTS.some((host) => host.test(url.hostname));
}
