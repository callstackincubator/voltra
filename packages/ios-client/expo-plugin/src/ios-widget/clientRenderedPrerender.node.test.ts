import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { prerenderClientRenderedWidgets } from './clientRenderedPrerender'
import type { DetectedIOSWidget } from './clientRendered'

jest.mock('@use-voltra/ios', () => ({
  renderVoltraVariantToJson: jest.fn((value: unknown) => value),
}))

const { renderVoltraVariantToJson } = jest.requireMock('@use-voltra/ios') as {
  renderVoltraVariantToJson: jest.Mock
}

function makeTempProject(files: Record<string, string>): { projectRoot: string; cleanup: () => void } {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-ios-client-prerender-'))
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

describe('prerenderClientRenderedWidgets', () => {
  afterEach(() => {
    renderVoltraVariantToJson.mockClear()
  })

  it('evaluates the entry default export for a Dynamic Widget placeholder', async () => {
    const { projectRoot, cleanup } = makeTempProject({
      'package.json': '{}\n',
      'node_modules/@use-voltra/ios-client/package.json': JSON.stringify({
        name: '@use-voltra/ios-client',
        version: '9.8.7',
      }),
      'widgets/Dynamic.tsx': `
        export default function NotTheWidgetId(props, env) {
          return {
            source: 'entry',
            widgetFamily: env.widgetFamily,
            hasProps: typeof props === 'object',
            voltraVersion: env.build.voltraVersion,
          }
        }
      `,
    })

    try {
      const widget: DetectedIOSWidget = {
        id: 'dynamic_widget',
        entry: './widgets/Dynamic.tsx',
        displayName: 'Dynamic Widget',
        description: 'Uses the entry default export',
        clientRendered: true,
        clientSourcePath: path.join(projectRoot, 'widgets/Dynamic.tsx'),
      }

      const result = await prerenderClientRenderedWidgets([widget], projectRoot)

      expect(renderVoltraVariantToJson).toHaveBeenCalledTimes(1)
      expect(result.get('dynamic_widget')?.get('__default')).toContain('"source":"entry"')
      expect(result.get('dynamic_widget')?.get('__default')).toContain('"widgetFamily":"systemMedium"')
      expect(result.get('dynamic_widget')?.get('__default')).toContain('"voltraVersion":"9.8.7"')
    } finally {
      cleanup()
    }
  })
})
