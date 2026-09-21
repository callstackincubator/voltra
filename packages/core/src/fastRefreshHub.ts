/**
 * Shared wrapper over Metro's global `__accept` Fast Refresh callback (DEV only).
 *
 * Metro invokes `global.__accept` for every accepted Fast Refresh patch, and may
 * call it several times for a single save (it debounces React Refresh precisely
 * because of this). Each Voltra dev hook — on both iOS and Android — used to wrap
 * `__accept` itself, so N hooks meant N wrappers, N side effects per patch, and
 * teardown order that could clobber another hook's wrapper.
 *
 * This hub wraps `__accept` exactly once per process, lets hooks subscribe via
 * {@link FastRefreshHub.onPatch}, and debounces notifications so a burst of
 * `__accept` calls from one save collapses into a single notification. It is
 * platform-agnostic (it only touches the Metro runtime global), so iOS and
 * Android hooks share one instance.
 */

const PATCH_DEBOUNCE_MS = 32

declare global {
  // Metro installs this during runtime init; absent outside a Metro/HMR runtime.
  var __accept: ((...args: unknown[]) => void) | undefined
  var __voltraFastRefreshHub: FastRefreshHub | undefined
}

export interface FastRefreshHub {
  /** True only while a Fast Refresh patch is being applied synchronously. */
  readonly isAccepting: boolean
  /**
   * Run `listener` once per debounced Fast Refresh patch burst. Returns an
   * unsubscribe function; the shared `__accept` wrapper stays installed.
   */
  onPatch(listener: () => void): () => void
}

class FastRefreshHubImpl implements FastRefreshHub {
  private readonly listeners = new Set<() => void>()
  private readonly previousAccept = global.__accept
  private flushTimer: ReturnType<typeof setTimeout> | undefined
  private accepting = false

  constructor() {
    global.__accept = (...args) => {
      // Metro re-evaluates changed module factories synchronously inside
      // `__accept`, so any signal a re-evaluated module emits (e.g. a generated
      // definition reporting its id) arrives while `accepting` is true.
      this.accepting = true
      try {
        this.previousAccept?.(...args)
      } finally {
        this.accepting = false
      }
      this.scheduleFlush()
    }
  }

  get isAccepting(): boolean {
    return this.accepting
  }

  onPatch(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer != null) {
      clearTimeout(this.flushTimer)
    }
    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined
      // Snapshot so a listener that unsubscribes mid-flush doesn't mutate the
      // set we're iterating.
      for (const listener of [...this.listeners]) {
        listener()
      }
    }, PATCH_DEBOUNCE_MS)
  }
}

/**
 * Return the process-wide {@link FastRefreshHub}, installing the `__accept`
 * wrapper on first use. Intended to be called only in DEV builds.
 */
export function getFastRefreshHub(): FastRefreshHub {
  return (global.__voltraFastRefreshHub ??= new FastRefreshHubImpl())
}
