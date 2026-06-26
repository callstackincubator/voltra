import assert from 'node:assert/strict'
import { afterEach, describe, mock, test } from 'node:test'

import { createErrorOnlyMetroReporter } from './createErrorOnlyMetroReporter.ts'

describe('@use-voltra/metro error-only Metro reporter', () => {
  afterEach(() => {
    mock.restoreAll()
  })

  test('swallows startup and progress noise', () => {
    const writes: string[] = []
    mock.method(process.stderr, 'write', (chunk: string | Uint8Array) => {
      writes.push(String(chunk))
      return true
    })

    const reporter = createErrorOnlyMetroReporter()

    reporter.update({ type: 'initialize_started', port: 8081, hasReducedPerformance: false })
    reporter.update({ type: 'dep_graph_loading', hasReducedPerformance: false })
    reporter.update({ type: 'server_listening', port: 8081, address: '127.0.0.1', family: 'IPv4' })

    assert.equal(writes.length, 0)
  })

  test('still reports Metro errors', () => {
    const writes: string[] = []
    mock.method(process.stderr, 'write', (chunk: string | Uint8Array) => {
      writes.push(String(chunk))
      return true
    })

    const reporter = createErrorOnlyMetroReporter()
    const error = new Error('boom')

    reporter.update({ type: 'bundling_error', error })

    assert.ok(writes.length > 0)
    assert.ok(writes.join('').includes('boom'))
  })

  test('reports Metro startup failures', () => {
    const writes: string[] = []
    mock.method(process.stderr, 'write', (chunk: string | Uint8Array) => {
      writes.push(String(chunk))
      return true
    })

    const reporter = createErrorOnlyMetroReporter()

    reporter.update({ type: 'initialize_failed', port: 8081, error: new Error('init failed') })

    assert.ok(writes.join('').includes('init failed'))
  })

  test('reports Metro load and cache failures', () => {
    const writes: string[] = []
    mock.method(process.stderr, 'write', (chunk: string | Uint8Array) => {
      writes.push(String(chunk))
      return true
    })

    const reporter = createErrorOnlyMetroReporter()

    reporter.update({ type: 'transformer_load_failed', error: new Error('transformer failed') })
    reporter.update({ type: 'cache_read_error', error: new Error('cache failed') })

    assert.ok(writes.join('').includes('transformer_load_failed'))
    assert.ok(writes.join('').includes('cache_read_error'))
  })
})
