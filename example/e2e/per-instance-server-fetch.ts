#!/usr/bin/env -S npx tsx
/**
 * Minimal, reproducible E2E proof for ADR 0007 (per-instance server fetches).
 *
 * This does NOT start the fake server, Metro, or build/install the app for you — see the
 * README in this directory for the exact setup commands and prerequisites. It assumes:
 *
 *   - The fake server is running (`pnpm widget:server` from `example/`), and its stdout is
 *     being captured to the file named by SERVER_LOG_PATH.
 *   - Metro is running and reachable by the target device/simulator.
 *   - The app is installed on the target and `agent-device` is authenticated against it.
 *
 * Usage:
 *   SERVER_LOG_PATH=/tmp/widget-server.log tsx e2e/per-instance-server-fetch.ts android
 *   SERVER_LOG_PATH=/tmp/widget-server.log tsx e2e/per-instance-server-fetch.ts ios
 *
 * Each scenario shells out to the `agent-device` CLI (see the `agent-device` skill / `agent-device
 * help workflow`) and does light assertions against its output plus the server log. It is meant to
 * be read and adapted, not treated as a black box — every agent-device call is printed before it
 * runs.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const platform = process.argv[2]
const SERVER_LOG_PATH = process.env.SERVER_LOG_PATH ?? '/tmp/widget-server-e2e.log'
const ANDROID_SERIAL = process.env.ANDROID_SERIAL ?? 'emulator-5554'
const APP_ID = 'com.callstackincubator.voltraexample'

function sh(cmd: string, args: string[]): string {
  console.log(`\n$ ${cmd} ${args.join(' ')}`)
  const out = execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
  console.log(out)
  return out
}

function agentDevice(args: string[]): string {
  return sh('agent-device', args)
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`)
  }
}

function readServerLogSince(marker: string): string {
  const content = readFileSync(SERVER_LOG_PATH, 'utf8')
  const idx = content.lastIndexOf(marker)
  return idx === -1 ? content : content.slice(idx)
}

async function androidScenarios() {
  agentDevice(['open', APP_ID, '--platform', 'android', '--serial', ANDROID_SERIAL])
  agentDevice(['snapshot', '-i'])

  // --- Scenario (a): two placements, two cities, distinct server data + distinct `instance` ---
  console.log('\n=== Scenario A: two placements, two cities ===')
  const marker = `--- scenario-a ${Date.now()} ---`
  console.log(marker)

  // Requires two AndroidClientDemoWidget placements already pinned on the Home Screen (the
  // README documents pinning both from the app's "Request pin" control + the system Add dialog).
  agentDevice(['open', APP_ID, '--platform', 'android', '--serial', ANDROID_SERIAL, '--relaunch'])
  agentDevice(['snapshot', '-i'])

  // Set the two placements' cities via the in-app controls (testIDs from
  // example/screens/PerInstanceServerFetchScreen.tsx). The exact appWidgetId-suffixed testIDs
  // depend on what got pinned; read them off the fresh snapshot.
  console.log(
    'Set each placement to a distinct city using the "city-input-<appWidgetId>" field and the ' +
      '"set-city-<appWidgetId>" button (see README for the interactive walkthrough), then reload:'
  )
  agentDevice(['press', 'label="Reload Android widgets"', '--settle'])

  // Give WorkManager a moment to run the periodic fetch, then check the server log for two
  // distinct `instance` values sharing the same widgetId, with matching configuration payloads.
  const logSinceA = readServerLogSince(marker)
  const instanceMatches = [...logSinceA.matchAll(/AndroidClientDemoWidget instance=(\S+) configuration=(\S+)/g)]
  const distinctInstances = new Set(instanceMatches.map((m) => m[1]))
  console.log(`Server log instances seen since scenario start: ${[...distinctInstances].join(', ')}`)
  assert(distinctInstances.size >= 2, 'expected at least two distinct instance values in the server log')

  // --- Scenario (b): two placements, same city → one server request per interval ---
  console.log('\n=== Scenario B: two placements, same city (coalesced fetch) ===')
  const markerB = `--- scenario-b ${Date.now()} ---`
  console.log(markerB)
  agentDevice(['press', 'label="Reload Android widgets"', '--settle'])
  const logSinceB = readServerLogSince(markerB)
  const matchesB = [...logSinceB.matchAll(/AndroidClientDemoWidget instance=(\S+) configuration=(\S+)/g)]
  const distinctB = new Set(matchesB.map((m) => m[1]))
  console.log(`Server log instances seen for the same-city case: ${[...distinctB].join(', ')}`)
  assert(distinctB.size === 1, 'expected exactly one instance value when both placements share a city')

  agentDevice(['close'])
  console.log('\nAndroid scenarios passed.')
}

async function iosScenarios() {
  console.log('\n=== Scenario C: iOS single placement, default configuration ===')
  const marker = `--- scenario-c ${Date.now()} ---`
  console.log(marker)

  agentDevice(['open', 'com.apple.springboard', '--platform', 'ios'])
  agentDevice(['snapshot', '-i'])
  console.log(
    'Place "Client-Rendered Demo" on the Home Screen via SpringBoard edit mode (see README / ' +
      'agent-device help ios-system-ui), then confirm it renders server city/temperature + env.instance.'
  )

  const logSince = readServerLogSince(marker)
  const matches = [...logSince.matchAll(/ClientRenderedDemoWidget instance=(\S+) configuration=(\S+)/g)]
  assert(matches.length >= 1, 'expected at least one ClientRenderedDemoWidget request in the server log')
  console.log(`Server saw ${matches.length} ClientRenderedDemoWidget request(s), e.g. ${JSON.stringify(matches[0])}`)

  console.log('\niOS scenario passed (default-configuration coverage; see README for what could not be verified).')
}

async function main() {
  if (platform === 'android') {
    await androidScenarios()
  } else if (platform === 'ios') {
    await iosScenarios()
  } else {
    console.error('Usage: tsx e2e/per-instance-server-fetch.ts <android|ios>')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
