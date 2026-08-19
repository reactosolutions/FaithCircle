// In-memory sliding-window limiter — fine for a single Node process, but
// resets on redeploy and doesn't share state across multiple instances.
// A real multi-instance deployment needs a shared store (Upstash Redis is
// the usual pick alongside Vercel); swapping this module's internals for
// that later doesn't need to touch any call site, since checkRateLimit()'s
// signature stays the same either way.
const attempts = new Map<string, number[]>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= limit) {
    attempts.set(key, recent);
    return false;
  }

  recent.push(now);
  attempts.set(key, recent);
  return true;
}
