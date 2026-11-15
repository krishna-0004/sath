/**
 * Central client-side error reporting handler.
 * In development, reports safely to the console; hook point for future Sentry/monitoring integration.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    // Only logged in development
    // eslint-disable-next-line no-console
    console.error("[Saath Error Report]:", error, context);
  }
}
