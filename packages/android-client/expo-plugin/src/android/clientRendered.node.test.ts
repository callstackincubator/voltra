import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import type { AndroidWidgetConfig } from '../types'
import { detectClientRenderedWidgets } from './clientRendered'

function makeTempProject(files: Record<string, string>): { projectRoot: string; cleanup: () => void } {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-android-client-rendered-test-'))
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(projectRoot, rel)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, content)
  }
  return {
    projectRoot,
    cleanup: () => fs.rmSync(projectRoot, { recursive: true, force: true }),
  }
}

function asWidget(partial: Partial<AndroidWidgetConfig>): AndroidWidgetConfig {
  return {
    id: 'placeholder',
    entry: './widgets/placeholder.tsx',
    displayName: 'Placeholder',
    description: 'Placeholder',
    targetCellWidth: 2,
    targetCellHeight: 2,
    ...partial,
  }
}

// Detection emits a one-time EXPERIMENTAL console.warn; keep it out of test output (the dedicated
// suite below asserts on it explicitly).
beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  jest.restoreAllMocks()
})

describe('detectClientRenderedWidgets (android)', () => {
  it('flags a use voltra component as client-rendered when the id matches', () => {
    const { projectRoot, cleanup } = makeTempProject({
      'widgets/Foo.tsx': `
        export const Foo = (props, env) => {
          'use voltra'
          return null
        }
      `,
    })
    try {
      const [detected] = detectClientRenderedWidgets(
        [asWidget({ id: 'Foo', initialStatePath: './widgets/Foo.tsx' })],
        projectRoot
      )
      expect(detected.clientRendered).toBe(true)
    } finally {
      cleanup()
    }
  })
})

describe('detectClientRenderedWidgets (android) — experimental warning', () => {
  // The warning fires at most once per module instance, so re-require a fresh module per test.
  function freshDetect(): typeof detectClientRenderedWidgets {
    let fn: typeof detectClientRenderedWidgets = detectClientRenderedWidgets
    jest.isolateModules(() => {
      fn = require('./clientRendered').detectClientRenderedWidgets
    })
    return fn
  }

  it('warns once (with EXPERIMENTAL + the widget id) when a client-rendered widget is detected', () => {
    const detect = freshDetect()
    const warn = console.warn as jest.Mock
    const { projectRoot, cleanup } = makeTempProject({
      'widgets/Foo.tsx': `
        export const Foo = (props, env) => {
          'use voltra'
          return null
        }
      `,
    })
    try {
      const widgets = [asWidget({ id: 'Foo', initialStatePath: './widgets/Foo.tsx' })]
      detect(widgets, projectRoot)
      detect(widgets, projectRoot)

      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0][0]).toContain('EXPERIMENTAL')
      expect(warn.mock.calls[0][0]).toContain('Foo')
    } finally {
      cleanup()
    }
  })

  it('does not warn when all widgets are server-rendered', () => {
    const detect = freshDetect()
    const warn = console.warn as jest.Mock
    const { projectRoot, cleanup } = makeTempProject({
      'widgets/Bar.tsx': 'export default () => null\n',
    })
    try {
      detect([asWidget({ id: 'Bar', initialStatePath: './widgets/Bar.tsx' })], projectRoot)
      expect(warn).not.toHaveBeenCalled()
    } finally {
      cleanup()
    }
  })
})
