import * as fs from 'node:fs'
import * as path from 'node:path'
import { createRequire } from 'node:module'

interface PackageManifest {
  version?: unknown
}

export function resolveInstalledPackageVersion(projectRoot: string, packageName: string): string {
  const projectRequire = createRequire(path.join(projectRoot, 'package.json'))
  const packageJsonPath = projectRequire.resolve(`${packageName}/package.json`)
  const manifest = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageManifest

  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    throw new Error(`Package ${packageName} does not declare a valid version in ${packageJsonPath}.`)
  }

  return manifest.version
}
