import * as React from 'react'

const ReactTestRenderer = require('react-test-renderer') as {
  act: (callback: () => void | Promise<void>) => Promise<void>
  create: (element: React.ReactElement) => { unmount: () => void }
}

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}))

import { useUpdateOnHMR } from '../../src/utils/useUpdateOnHMR.js'

let renders = 0

function Probe() {
  useUpdateOnHMR()
  renders += 1
  return null
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const accept = (...args: unknown[]) => {
  ;(globalThis as { __accept?: (...args: unknown[]) => void }).__accept?.(...args)
}

describe('useUpdateOnHMR', () => {
  beforeEach(() => {
    ;(globalThis as { __DEV__?: boolean }).__DEV__ = true
    ;(globalThis as { __voltraFastRefreshHub?: unknown }).__voltraFastRefreshHub = undefined
    renders = 0
  })

  it('re-renders the component once per debounced Fast Refresh patch burst', async () => {
    ;(globalThis as { __accept?: (...args: unknown[]) => void }).__accept = jest.fn()

    let tree!: ReturnType<typeof ReactTestRenderer.create>
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(React.createElement(Probe))
    })
    expect(renders).toBe(1)

    await ReactTestRenderer.act(async () => {
      // One Metro save may fire several `__accept` calls; the hub debounces them.
      accept('patch-1')
      accept('patch-2')
      await wait(120)
    })
    expect(renders).toBe(2)

    await ReactTestRenderer.act(async () => {
      accept('patch-3')
      await wait(120)
    })
    expect(renders).toBe(3)

    await ReactTestRenderer.act(async () => {
      tree.unmount()
    })
    await ReactTestRenderer.act(async () => {
      accept('patch-after-unmount')
      await wait(120)
    })
    expect(renders).toBe(3)
  })
})
