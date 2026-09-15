import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { resolveInstalledPackageVersion } from './packageVersion'

describe('resolveInstalledPackageVersion', () => {
  it('reads the version from the package installed in the project', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-package-version-'))
    const packageDir = path.join(projectRoot, 'node_modules', '@use-voltra', 'ios-client')
    fs.mkdirSync(packageDir, { recursive: true })
    fs.writeFileSync(path.join(projectRoot, 'package.json'), '{}\n')
    fs.writeFileSync(
      path.join(packageDir, 'package.json'),
      `${JSON.stringify({ name: '@use-voltra/ios-client', version: '9.8.7' })}\n`
    )

    try {
      expect(resolveInstalledPackageVersion(projectRoot, '@use-voltra/ios-client')).toBe('9.8.7')
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true })
    }
  })
})
