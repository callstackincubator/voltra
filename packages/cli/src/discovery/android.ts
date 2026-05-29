import fs from 'node:fs/promises'
import path from 'node:path'

import type { Stats } from 'node:fs'

import { VoltraCliError } from '../reporting/summary'

import type { NormalizedAndroidProjectConfig } from '../config/types'

const ANDROID_MANIFEST_FILE_NAME = 'AndroidManifest.xml'

export interface AndroidProjectDiscovery {
  androidRoot: string
  appModuleName: string
  appModuleRoot: string
  manifestPath: string
  buildGradlePath: string
  packageName: string
}

export class AndroidProjectDiscoveryError extends VoltraCliError {
  constructor(message: string) {
    super(message, 'VOLTRA_ANDROID_DISCOVERY_FAILED')
    this.name = 'AndroidProjectDiscoveryError'
  }
}

export async function discoverAndroidProject(
  projectRoot: string,
  config: NormalizedAndroidProjectConfig
): Promise<AndroidProjectDiscovery> {
  const androidRoot = await resolveAndroidRoot(projectRoot, config)
  const manifestPath = await resolveManifestPath(androidRoot, config)
  const appModuleName = resolveAppModuleName(androidRoot, manifestPath, config.appModuleName)
  const appModuleRoot = path.join(androidRoot, appModuleName)

  await ensureDirectory(appModuleRoot, `Android app module directory does not exist: ${appModuleRoot}`)
  ensureManifestBelongsToAppModule(appModuleRoot, manifestPath)

  const buildGradlePath = await resolveBuildGradlePath(appModuleRoot)
  const packageName = config.packageName ?? (await resolvePackageName(buildGradlePath, manifestPath))

  return {
    androidRoot,
    appModuleName,
    appModuleRoot,
    manifestPath,
    buildGradlePath,
    packageName,
  }
}

async function resolveAndroidRoot(projectRoot: string, config: NormalizedAndroidProjectConfig): Promise<string> {
  const androidRoot = config.rootDir ?? path.join(projectRoot, 'android')

  await ensureDirectory(
    androidRoot,
    config.rootDir
      ? `Configured Android root directory does not exist: ${androidRoot}`
      : `Android root directory does not exist at ${androidRoot}. Set android.project.rootDir to override the default android/ layout.`
  )

  return androidRoot
}

async function resolveManifestPath(androidRoot: string, config: NormalizedAndroidProjectConfig): Promise<string> {
  const manifestPath =
    config.manifestPath ??
    path.join(androidRoot, config.appModuleName ?? 'app', 'src', 'main', ANDROID_MANIFEST_FILE_NAME)

  await ensureFile(
    manifestPath,
    config.manifestPath
      ? `Configured Android manifest does not exist: ${manifestPath}`
      : `Android manifest does not exist at ${manifestPath}. Set android.project.appModuleName or android.project.manifestPath to override the default app/src/main/AndroidManifest.xml layout.`
  )

  return manifestPath
}

function resolveAppModuleName(
  androidRoot: string,
  manifestPath: string,
  configuredAppModuleName: string | undefined
): string {
  if (configuredAppModuleName) {
    return configuredAppModuleName
  }

  const relativeManifestPath = path.relative(androidRoot, manifestPath)

  if (relativeManifestPath.startsWith('..') || path.isAbsolute(relativeManifestPath)) {
    throw new AndroidProjectDiscoveryError(
      `Android manifest ${manifestPath} is outside Android root ${androidRoot}. Set android.project.appModuleName to identify the app module explicitly.`
    )
  }

  const segments = relativeManifestPath.split(path.sep)

  if (
    segments.length >= 4 &&
    segments[1] === 'src' &&
    segments[2] === 'main' &&
    segments[3] === ANDROID_MANIFEST_FILE_NAME
  ) {
    return segments[0]
  }

  throw new AndroidProjectDiscoveryError(
    `Could not derive Android app module from manifest path ${manifestPath}. Set android.project.appModuleName explicitly.`
  )
}

async function resolveBuildGradlePath(appModuleRoot: string): Promise<string> {
  const buildGradlePath = path.join(appModuleRoot, 'build.gradle')
  const buildGradleKtsPath = path.join(appModuleRoot, 'build.gradle.kts')
  const hasBuildGradle = await pathExists(buildGradlePath)
  const hasBuildGradleKts = await pathExists(buildGradleKtsPath)

  if (hasBuildGradle && hasBuildGradleKts) {
    throw new AndroidProjectDiscoveryError(
      `Android app module has both build.gradle and build.gradle.kts: ${appModuleRoot}. Remove the ambiguity before running voltra apply.`
    )
  }

  if (hasBuildGradle) {
    return buildGradlePath
  }

  if (hasBuildGradleKts) {
    return buildGradleKtsPath
  }

  throw new AndroidProjectDiscoveryError(
    `Android app module build file does not exist in ${appModuleRoot}. Expected build.gradle or build.gradle.kts.`
  )
}

function ensureManifestBelongsToAppModule(appModuleRoot: string, manifestPath: string): void {
  const relativeManifestPath = path.relative(appModuleRoot, manifestPath)

  if (relativeManifestPath.startsWith('..') || path.isAbsolute(relativeManifestPath)) {
    throw new AndroidProjectDiscoveryError(
      `Android manifest ${manifestPath} is outside app module ${appModuleRoot}. Align android.project.appModuleName and android.project.manifestPath so they point at the same module.`
    )
  }
}

async function resolvePackageName(buildGradlePath: string, manifestPath: string): Promise<string> {
  const buildGradle = stripGradleComments(await fs.readFile(buildGradlePath, 'utf8'))
  const namespace = matchGradleStringLiteral(buildGradle, 'namespace')

  if (namespace) {
    return namespace
  }

  const applicationId = matchGradleStringLiteral(buildGradle, 'applicationId')

  if (applicationId) {
    return applicationId
  }

  const manifest = await fs.readFile(manifestPath, 'utf8')
  const manifestPackage = matchManifestPackage(manifest)

  if (manifestPackage) {
    return manifestPackage
  }

  throw new AndroidProjectDiscoveryError(
    `Could not determine Android package name from ${buildGradlePath} or ${manifestPath}. Set android.project.packageName explicitly or add namespace/applicationId to the app module build file.`
  )
}

function matchGradleStringLiteral(content: string, propertyName: string): string | undefined {
  const match = content.match(new RegExp(`\\b${propertyName}\\s*(?:=)?\\s*['"]([^'"]+)['"]`))

  return match?.[1]
}

function stripGradleComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')
}

function matchManifestPackage(content: string): string | undefined {
  const match = content.match(/<manifest\b[^>]*\bpackage\s*=\s*['"]([^'"]+)['"]/)

  return match?.[1]
}

async function ensureDirectory(dirPath: string, message: string): Promise<void> {
  const stat = await readPathStat(dirPath)

  if (!stat) {
    throw new AndroidProjectDiscoveryError(message)
  }

  if (!stat.isDirectory()) {
    throw new AndroidProjectDiscoveryError(`Expected a directory but found a file: ${dirPath}`)
  }
}

async function ensureFile(filePath: string, message: string): Promise<void> {
  const stat = await readPathStat(filePath)

  if (!stat) {
    throw new AndroidProjectDiscoveryError(message)
  }

  if (!stat.isFile()) {
    throw new AndroidProjectDiscoveryError(`Expected a file but found a directory: ${filePath}`)
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  return (await readPathStat(targetPath)) !== undefined
}

async function readPathStat(targetPath: string): Promise<Stats | undefined> {
  try {
    return await fs.stat(targetPath)
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return undefined
    }

    throw error
  }
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
