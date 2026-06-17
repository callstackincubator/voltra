import fs from 'node:fs/promises'
import path from 'node:path'

import { logger } from './logger'
import { prerenderWidgetState } from './prerender'

async function writePackage(root: string, packageName: string, source: string): Promise<void> {
  const packageDir = path.join(root, 'node_modules', ...packageName.split('/'))
  await fs.mkdir(packageDir, { recursive: true })
  await fs.writeFile(
    path.join(packageDir, 'package.json'),
    JSON.stringify(
      {
        name: packageName,
        main: 'index.js',
      },
      null,
      2
    )
  )
  await fs.writeFile(path.join(packageDir, 'index.js'), source)
}

describe('prerenderWidgetState', () => {
  it.each([
    ['@use-voltra/ios-client', '@use-voltra/ios', 'ios'],
    ['@use-voltra/android-client', '@use-voltra/android', 'android'],
  ] as const)('redirects %s to %s and warns once', async (clientPackage, targetPackage, targetLabel) => {
    const tempRoot = await fs.mkdtemp(path.join(process.cwd(), '.tmp-prerender-'))
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined)

    try {
      await fs.writeFile(
        path.join(tempRoot, 'package.json'),
        JSON.stringify(
          {
            name: 'fixture-project',
          },
          null,
          2
        )
      )

      await fs.mkdir(path.join(tempRoot, 'widgets'), { recursive: true })
      await writePackage(tempRoot, targetPackage, `exports.label = ${JSON.stringify(targetLabel)}\n`)
      await writePackage(tempRoot, clientPackage, `throw new Error('client package should not load')\n`)

      await fs.writeFile(
        path.join(tempRoot, 'widgets', 'state.ts'),
        [`import { label } from '${clientPackage}'`, 'export default { label }', ''].join('\n')
      )

      const states = await prerenderWidgetState(
        [{ id: 'demo', initialStatePath: './widgets/state.ts' }],
        tempRoot,
        (variants) => JSON.stringify(variants)
      )

      expect(states.get('demo')?.get('__default')).toBe(JSON.stringify({ label: targetLabel }))
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(clientPackage))
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(targetPackage))
    } finally {
      warnSpy.mockRestore()
      await fs.rm(tempRoot, { recursive: true, force: true })
    }
  })
})
