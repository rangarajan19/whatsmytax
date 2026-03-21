import { track } from '@vercel/analytics';

/**
 * Thin wrapper around Vercel Analytics track().
 * Non-blocking — any failure is silently swallowed so it never
 * affects the user-facing calculation.
 */
export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean>,
) {
  try {
    track(name, props);
  } catch {
    // analytics must never crash the app
  }
}
