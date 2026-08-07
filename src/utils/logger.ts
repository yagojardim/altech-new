/** Tiny logging helper so data-layer failures are traceable but never fatal. */
type Ctx = Record<string, unknown> | undefined

function fmt(scope: string, ctx: Ctx): string {
  if (!ctx) return `[${scope}]`
  try { return `[${scope}] ${JSON.stringify(ctx)}` } catch { return `[${scope}]` }
}

export const logger = {
  error(scope: string, err: unknown, ctx?: Ctx) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(fmt(scope, ctx), msg, err)
  },
  warn(scope: string, msg: string, ctx?: Ctx) {
    console.warn(fmt(scope, ctx), msg)
  },
}

/**
 * Runs an async data call and degrades to `fallback` on any failure.
 * Guarantees the caller never has to handle a rejected promise.
 */
export async function safeCall<T>(scope: string, fn: () => Promise<T>, fallback: T, ctx?: Ctx): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    logger.error(scope, err, ctx)
    return fallback
  }
}
