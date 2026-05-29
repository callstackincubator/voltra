import path from 'node:path'
import { createRequire } from 'node:module'

import type { VoltraPlatform } from '../config/types'

const PLATFORM_PACKAGE_NAMES: Record<VoltraPlatform, string> = {
  android: '@use-voltra/android',
  ios: '@use-voltra/ios',
}

const PLATFORM_CLIENT_PACKAGE_NAMES: Record<VoltraPlatform, string> = {
  android: '@use-voltra/android-client',
  ios: '@use-voltra/ios-client',
}

export function getPlatformPackageName(platform: VoltraPlatform): string {
  return PLATFORM_PACKAGE_NAMES[platform]
}

export function getPlatformClientPackageName(platform: VoltraPlatform): string {
  return PLATFORM_CLIENT_PACKAGE_NAMES[platform]
}

export function isPlatformPackageInstalled(projectRoot: string, platform: VoltraPlatform): boolean {
  return getMissingPlatformPackages(projectRoot, platform).length === 0
}

export function getMissingPlatformPackages(projectRoot: string, platform: VoltraPlatform): string[] {
  const projectRequire = createProjectRequire(projectRoot)
  const packageNames = getRequiredPlatformPackageNames(platform)

  return packageNames.filter((packageName) => !canResolvePackage(projectRequire, packageName))
}

export function requirePlatformPackage<TPackage>(projectRoot: string, platform: VoltraPlatform): TPackage {
  return createProjectRequire(projectRoot)(getPlatformPackageName(platform)) as TPackage
}

export function getMissingPlatformPackageMessage(
  platform: VoltraPlatform,
  packageNames = getRequiredPlatformPackageNames(platform)
): string {
  const packageLabel = packageNames.length === 1 ? 'package' : 'packages'
  const verb = packageNames.length === 1 ? 'is' : 'are'
  const pronoun = packageNames.length === 1 ? 'it' : 'them'

  return `Required ${packageLabel} ${formatPackageList(packageNames)} ${verb} not installed in the app project. Install ${pronoun} because voltra.config includes a ${platform} config block.`
}

function getRequiredPlatformPackageNames(platform: VoltraPlatform): string[] {
  return [getPlatformPackageName(platform), getPlatformClientPackageName(platform)]
}

function canResolvePackage(projectRequire: NodeRequire, packageName: string): boolean {
  try {
    projectRequire.resolve(`${packageName}/package.json`)
    return true
  } catch {
    return false
  }
}

function formatPackageList(packageNames: string[]): string {
  if (packageNames.length === 1) {
    return packageNames[0]
  }

  return `${packageNames.slice(0, -1).join(', ')} and ${packageNames[packageNames.length - 1]}`
}

function createProjectRequire(projectRoot: string): NodeRequire {
  return createRequire(path.join(projectRoot, 'package.json'))
}
