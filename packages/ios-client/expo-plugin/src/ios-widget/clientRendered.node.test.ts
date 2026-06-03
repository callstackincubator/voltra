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
    displayName: 'Placeholder',
    description: 'Placeholder',
    ...partial,
  }
}

describe('detectClientRenderedWidgets', () => {
  it('flags an arrow-function export with use voltra directive as client-rendered when id matches', () => {
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
      if (detected.clientRendered) {
        expect(detected.clientComponentName).toBe('Foo')
        expect(detected.clientSourcePath).toBe(path.join(projectRoot, 'widgets/Foo.tsx'))
      }
    } finally {
      cleanup()
    }
  })

  it('flags a function declaration export with use voltra directive as client-rendered', () => {
    const { projectRoot, cleanup } = makeTempProject({
      'widgets/Bar.tsx': `
        export function Bar(props, env) {
          'use voltra'
          return null
        }
      `,
    })
    try {
      const [detected] = detectClientRenderedWidgets(
        [asWidget({ id: 'Bar', initialStatePath: './widgets/Bar.tsx' })],
        projectRoot
      )
      expect(detected.clientRendered).toBe(true)
    } finally {
      cleanup()
    }
  })

  it('returns server-rendered for files without the directive', () => {
    const { projectRoot, cleanup } = makeTempProject({
      'widgets/Plain.tsx': `
        export const Plain = () => null
      `,
    })
    try {
      const [detected] = detectClientRenderedWidgets(
        [asWidget({ id: 'Plain', initialStatePath: './widgets/Plain.tsx' })],
        projectRoot
      )
      expect(detected.clientRendered).toBe(false)
    } finally {
      cleanup()
    }
  })

  it('returns server-rendered when initialStatePath is missing', () => {
    const { projectRoot, cleanup } = makeTempProject({})
    try {
      const [detected] = detectClientRenderedWidgets([asWidget({ id: 'NoPath' })], projectRoot)
      expect(detected.clientRendered).toBe(false)
    } finally {
      cleanup()
    }
  })

  it('throws when widget id does not match the use voltra component name', () => {
    const { projectRoot, cleanup } = makeTempProject({
      'widgets/Real.tsx': `
        export const RealName = () => {
          'use voltra'
          return null
        }
      `,
    })
    try {
      expect(() =>
        detectClientRenderedWidgets(
          [asWidget({ id: 'WrongName', initialStatePath: './widgets/Real.tsx' })],
          projectRoot
        )
      ).toThrow(/Widget id mismatch/)
    } finally {
      cleanup()
    }
  })

  it('accepts a localized initialStatePath map (uses the first available locale)', () => {
    const { projectRoot, cleanup } = makeTempProject({
      'widgets/Localized.tsx': `
        export const Localized = () => {
          'use voltra'
          return null
        }
      `,
    })
    try {
      const [detected] = detectClientRenderedWidgets(
        [
          asWidget({
            id: 'Localized',
            initialStatePath: { en: './widgets/Localized.tsx', pl: './widgets/Localized.tsx' },
          }),
        ],
        projectRoot
      )
      expect(detected.clientRendered).toBe(true)
    } finally {
      cleanup()
    }
  })
})
