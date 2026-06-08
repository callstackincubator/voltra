const { execFile } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

/**
 * Track 5 / Phase 3b-iii — Metro middleware helper that delivers a silent push to the
 * iOS Simulator's booted device, asking the host app's VoltraDevReloadHandler to call
 * WidgetCenter.shared.reloadAllTimelines() (see VoltraDevReloadHandler.swift).
 *
 * Why a push instead of a host-app WebSocket: when the user is editing widget JSX, the
 * host app is typically backgrounded (they're looking at the home screen). iOS suspends
 * the host app's JS runtime within ~5 seconds of backgrounding, so any HMR-driven
 * trigger from the host app dies. Silent push is the one channel iOS reliably wakes
 * the app on regardless of background state. See the "Hot reload exploration log" in
 * DOCS/VOLTRA_CLIENT_RENDERED_WIDGETS.md for the failed attempts that led here.
 *
 * Simulator-only. Real-device dev would need an APNs setup — out of scope for PoC.
 *
 * Public API: `createDevPusher({ bundleId, debounceMs? })` returns:
 *   { fire(): void, dispose(): void }
 *
 * Behavior:
 *   - `fire()` coalesces rapid-fire calls within `debounceMs` (default 100ms) into a
 *     single `xcrun simctl push` invocation, so a save that touches multiple widget
 *     modules in the same Metro delta produces one push, not N.
 *   - First failure (`xcrun` missing, no simulator booted, push payload rejected) warns
 *     once and switches to silent no-op mode for the rest of the process lifetime.
 *     Hot reload silently degrades rather than spamming the dev's terminal.
 */
function createDevPusher({ bundleId, debounceMs = 100 }) {
  if (!bundleId) {
    return { fire() {}, dispose() {} }
  }

  let pendingTimer = null
  let warned = false
  let disposed = false

  function emitPush() {
    pendingTimer = null
    if (disposed) return

    const payload = JSON.stringify({
      aps: { 'content-available': 1 },
      'voltra-dev-reload': {},
    })
    const tmpFile = path.join(os.tmpdir(), `voltra-dev-push-${process.pid}-${Date.now()}.apns`)
    try {
      fs.writeFileSync(tmpFile, payload)
    } catch (writeErr) {
      warnOnce(`failed to write push payload: ${writeErr.message}`)
      return
    }

    // eslint-disable-next-line no-console
    console.log(`[voltra-dev-push] firing simctl push booted ${bundleId}`)
    execFile('xcrun', ['simctl', 'push', 'booted', bundleId, tmpFile], (err) => {
      fs.unlink(tmpFile, () => {})
      if (err) {
        warnOnce(`xcrun simctl push failed (no booted simulator? bundleId="${bundleId}"): ${err.message}`)
      } else {
        // eslint-disable-next-line no-console
        console.log('[voltra-dev-push] simctl push succeeded')
      }
    })
  }

  function warnOnce(msg) {
    if (warned) return
    warned = true
    // eslint-disable-next-line no-console
    console.warn(`[voltra-dev-push] ${msg}`)
    // eslint-disable-next-line no-console
    console.warn('[voltra-dev-push] further failures will be silent for the rest of this Metro process')
  }

  return {
    fire() {
      if (disposed) return
      if (pendingTimer) clearTimeout(pendingTimer)
      pendingTimer = setTimeout(emitPush, debounceMs)
    },
    dispose() {
      disposed = true
      if (pendingTimer) {
        clearTimeout(pendingTimer)
        pendingTimer = null
      }
    },
  }
}

module.exports = { createDevPusher }