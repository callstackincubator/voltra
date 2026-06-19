import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import type { IOSWidgetConfig } from '../types'

import { detectClientRenderedWidgets } from './clientRendered'

function makeTempProject(files: Record<string, string>): { projectRoot: string; cleanup: () => void } {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-client-rendered-test-'))
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

function asWidget(partial: Partial<IOSWidgetConfig>): IOSWidgetConfig {
  return {
    id: 'placeholder',
    entry: './widgets/placeholder.tsx',
    displayName: 'Placeholder',
    description: 'Placeholder',
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

describe('detectClientRenderedWidgets', () => {
  it('keeps widgets without an entry on the server-rendered path', () => {
    const { projectRoot, cleanup } = makeTempProject({})
    try {
      const [detected] = detectClientRenderedWidgets(
        [
          {
            id: 'legacy',
            displayName: 'Legacy',
            description: 'Server-rendered widget',
          },
        ],
        projectRoot
      )

      expect(detected.clientRendered).toBe(false)
      expect(detected).not.toHaveProperty('clientSourcePath')
    } finally {
      cleanup()
    }
  })

  it('flags a default-exported entry module as a Dynamic Widget even when the export name differs', () => {
    const { projectRoot, cleanup } = makeTempProject({
      'widgets/Foo.tsx': `
        export default function NotTheWidgetId(props, env) {
          return null
        }
      `,
    })
    try {
      const [detected] = detectClientRenderedWidgets([asWidget({ id: 'Foo', entry: './widgets/Foo.tsx' })], projectRoot)
      expect(detected.clientRendered).toBe(true)
      if (detected.clientRendered) {
        expect(detected.clientSourcePath).toBe(path.join(projectRoot, 'widgets/Foo.tsx'))
      }
    } finally {
      cleanup()
    }
  })

  it('throws when the entry default export is not a function', () => {
    const { projectRoot, cleanup } = makeTempProject({
      'widgets/Bar.tsx': `
        export const Bar = () => null
      `,
    })
    try {
      expect(() =>
        detectClientRenderedWidgets([asWidget({ id: 'Bar', entry: './widgets/Bar.tsx' })], projectRoot)
      ).toThrow(/Dynamic Widget "Bar" at widgets\/Bar\.tsx must default-export a function or component\./)
    } finally {
      cleanup()
    }
  })
})

describe('detectClientRenderedWidgets — experimental warning', () => {
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
        export default function Foo(props, env) {
          return null
        }
      `,
    })
    try {
      const widgets = [asWidget({ id: 'Foo', entry: './widgets/Foo.tsx' })]
      detect(widgets, projectRoot)
      detect(widgets, projectRoot) // second detection in the same process must not re-warn

      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0][0]).toContain('EXPERIMENTAL')
      expect(warn.mock.calls[0][0]).toContain('Foo')
    } finally {
      cleanup()
    }
  })

  it('does not warn when no Dynamic Widgets are detected', () => {
    const detect = freshDetect()
    const warn = console.warn as jest.Mock
    const { projectRoot, cleanup } = makeTempProject({})
    try {
      detect([], projectRoot)
      expect(warn).not.toHaveBeenCalled()
    } finally {
      cleanup()
    }
  })
})
