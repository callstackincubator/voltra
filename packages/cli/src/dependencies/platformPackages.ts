import path from 'node:path'
import { createRequire } from 'node:module'

import type { VoltraPlatform } from '../config/types'

const PLATFORM_PACKAGE_NAMES: Record<VoltraPlatform, string> = {
  android: '@use-voltra/android',
  ios: '@use-voltra/ios',
}

export function getPlatformPackageName(platform: VoltraPlatform): string {
  return PLATFORM_PACKAGE_NAMES[platform]
}

export function isPlatformPackageInstalled(projectRoot: string, platform: VoltraPlatform): boolean {
  const projectRequire = createProjectRequire(projectRoot)
  const packageName = getPlatformPackageName(platform)

  try {
    projectRequire.resolve(`${packageName}/package.json`)
    return true
  } catch {
    return false
  }
}

export function requirePlatformPackage<TPackage>(projectRoot: string, platform: VoltraPlatform): TPackage {
  return createProjectRequire(projectRoot)(getPlatformPackageName(platform)) as TPackage
}

export function getMissingPlatformPackageMessage(platform: VoltraPlatform): string {
  const packageName = getPlatformPackageName(platform)
  return `Required package ${packageName} is not installed in the app project. Install ${packageName} because voltra.config includes a ${platform} config block.`
}

function createProjectRequire(projectRoot: string): NodeRequire {
  return createRequire(path.join(projectRoot, 'package.json'))
}
