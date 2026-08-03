import { XcodeProject } from '@expo/config-plugins'
import * as util from 'util'

import type { IOSWidgetExtensionFiles } from '../../types'
import { ensureWidgetFileReference, normalizeRef } from './fileReferences'

const pbxFile = require('xcode/lib/pbxFile')

const WIDGET_BUNDLE_PHASE_NAME = 'Bundle Voltra Dynamic Widgets'

// Release-only build phase that bakes each Dynamic Widget's production JS bundle into the
// extension's resources. Debug builds fetch from Metro (and hot-reload), so this no-ops there. Runs
// the project's widget bundler with the extension's resources dir as the output, so each
// voltra-widget-<id>.bundle lands in the .appex (Bundle.main) where the runtime's release loader
// reads it. SRCROOT is the ios/ dir; the project root is one level up, matching how Expo's main
// "Bundle React Native code and images" phase resolves things.
const WIDGET_BUNDLE_SHELL_SCRIPT = `if [[ "$CONFIGURATION" == *Debug* ]]; then
  echo "Voltra: Debug build — Dynamic Widgets load from Metro, skipping bundling"
  exit 0
fi

if [[ -f "$SRCROOT/.xcode.env" ]]; then
  source "$SRCROOT/.xcode.env"
fi
if [[ -f "$SRCROOT/.xcode.env.local" ]]; then
  source "$SRCROOT/.xcode.env.local"
fi

export PROJECT_ROOT="\${PROJECT_ROOT:-$SRCROOT/..}"
NODE_BINARY="\${NODE_BINARY:-node}"

BUNDLER="$("$NODE_BINARY" - "$PROJECT_ROOT" <<'NODE'
const { createRequire } = require('node:module')
const path = require('node:path')

const projectRoot = process.argv[2]
const requireFromProject = createRequire(path.join(projectRoot, 'package.json'))

try {
  const resolved = requireFromProject.resolve('@use-voltra/metro/bundle-widgets')
  process.stdout.write(resolved)
} catch (error) {
  console.error(
    'error: Voltra widget bundler could not resolve @use-voltra/metro from ' +
      projectRoot +
      '. Install @use-voltra/metro in the app project so release widgets can be baked.'
  )
  console.error(error && error.message ? error.message : String(error))
  process.exit(1)
}
NODE
)"
if [[ -z "$BUNDLER" ]]; then
  echo "Voltra: resolver returned an empty string for @use-voltra/metro/bundle-widgets" >&2
  exit 1
fi

echo "Voltra: widget bundler resolved to $BUNDLER"
"$NODE_BINARY" "$BUNDLER" --out-dir "$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH" --platform ios --project-root "$PROJECT_ROOT"
`

/**
 * Adds (idempotently) the release-only shell-script phase that bakes Dynamic Widget
 * bundles into the extension. Safe to call on every prebuild; only added when absent.
 */
export function ensureWidgetBundleScriptPhase(xcodeProject: XcodeProject, targetUuid: string): void {
  const nativeTargets = xcodeProject.pbxNativeTargetSection()
  const target = nativeTargets[targetUuid]
  if (!target) {
    return
  }
  if (!target.buildPhases) {
    target.buildPhases = []
  }

  const shellPhases = xcodeProject.hash.project.objects.PBXShellScriptBuildPhase || {}
  const quotedName = `"${WIDGET_BUNDLE_PHASE_NAME}"`
  const alreadyPresent = target.buildPhases.some((entry: any) => shellPhases[entry.value]?.name === quotedName)
  if (alreadyPresent) {
    return
  }

  xcodeProject.addBuildPhase([], 'PBXShellScriptBuildPhase', WIDGET_BUNDLE_PHASE_NAME, targetUuid, {
    shellPath: '/bin/sh',
    shellScript: WIDGET_BUNDLE_SHELL_SCRIPT,
  })

  // The phase intentionally re-bakes on every release build (it can't statically enumerate every
  // widget source as an input). Mark it always-out-of-date so Xcode doesn't warn about the missing
  // input/output dependencies.
  const shellPhasesAfter = xcodeProject.hash.project.objects.PBXShellScriptBuildPhase || {}
  for (const key of Object.keys(shellPhasesAfter)) {
    if (/_comment$/.test(key)) {
      continue
    }
    if (shellPhasesAfter[key]?.name === quotedName) {
      shellPhasesAfter[key].alwaysOutOfDate = 1
    }
  }
}

export interface EnsureBuildPhasesOptions {
  targetUuid: string
  targetName: string
  groupName: string
  productFile: {
    uuid: string
    fileRef?: string
    target?: string
    basename: string
    group: string
  }
  widgetFiles: IOSWidgetExtensionFiles
  mainTargetUuid?: string
  /** Generated ActivityKit types compiled into both the extension and the app. */
  mainSwiftFiles?: string[]
}

/**
 * Finds a `PBXCopyFilesBuildPhase` on the given target that embeds app extensions
 * (`dstSubfolderSpec == 13`), regardless of its display name. Returns the phase object or null.
 *
 * A project that already contains another app extension (Share/Watch/expo-live-activity) will have
 * such a phase — typically named "Embed App Extensions" — and the widget's product must be added to
 * it rather than to a second, duplicate embed phase (issue #87).
 */
function findExistingEmbedExtensionsPhase(xcodeProject: XcodeProject, targetUuid: string): any | null {
  const nativeTargets = xcodeProject.pbxNativeTargetSection()
  const target = nativeTargets[targetUuid]
  if (!target?.buildPhases) {
    return null
  }

  const copyFilesSection = xcodeProject.hash.project.objects['PBXCopyFilesBuildPhase'] || {}
  for (const entry of target.buildPhases) {
    const phase = copyFilesSection[normalizeRef(entry.value)]
    if (phase && String(phase.dstSubfolderSpec) === '13') {
      return phase
    }
  }
  return null
}

/**
 * Finds a target's build phase of the given pbx section type by walking the target's own
 * `buildPhases` list and checking membership in the type's object section; the first match wins.
 *
 * This is deliberately semantic: pbxproj comments are decorative and other tools strip them, and
 * the xcode lib's `buildPhaseObject` both relies on comments and silently falls back to a
 * project-wide search that can return another target's phase (e.g. the main app's "Sources").
 * The embed phase is the one exception with extra semantics — see
 * {@link findExistingEmbedExtensionsPhase} (`dstSubfolderSpec == 13`).
 */
function findTargetPhaseByType(xcodeProject: XcodeProject, targetUuid: string, phaseType: string): any | null {
  const target = xcodeProject.pbxNativeTargetSection()[targetUuid]
  if (!target?.buildPhases) {
    return null
  }

  const phaseSection = xcodeProject.hash.project.objects[phaseType] || {}
  for (const entry of target.buildPhases) {
    const phase = phaseSection[normalizeRef(entry.value)]
    if (phase) {
      return phase
    }
  }
  return null
}

/**
 * Ensures all required build phases and files exist for the widget extension target.
 */
export function ensureBuildPhases(xcodeProject: XcodeProject, options: EnsureBuildPhasesOptions): void {
  const { targetUuid, targetName, groupName, productFile, widgetFiles } = options
  const buildPath = `""`
  const folderType = 'app_extension'
  const mainTargetUuid = options.mainTargetUuid ?? xcodeProject.getFirstTarget().uuid

  const { swiftFiles, intentFiles, assetDirectories, localizedStringResources } = widgetFiles
  const resourcePaths = [...assetDirectories, ...localizedStringResources]

  dedupeBuildPhasesForTarget(xcodeProject, targetUuid, 'PBXSourcesBuildPhase')
  dedupeBuildPhasesForTarget(xcodeProject, targetUuid, 'PBXFrameworksBuildPhase')
  dedupeEmbedPhasesForTarget(xcodeProject, mainTargetUuid)

  // Sources build phase
  let sourcesPhase = findTargetPhaseByType(xcodeProject, targetUuid, 'PBXSourcesBuildPhase')
  if (!sourcesPhase) {
    xcodeProject.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', targetUuid, folderType, buildPath)
    sourcesPhase = findTargetPhaseByType(xcodeProject, targetUuid, 'PBXSourcesBuildPhase')
  }
  if (sourcesPhase) {
    ensureBuildPhaseFiles(xcodeProject, sourcesPhase, [...swiftFiles, ...intentFiles], targetName)
  }

  if (options.mainSwiftFiles && options.mainSwiftFiles.length > 0) {
    let mainSourcesPhase = findTargetPhaseByType(xcodeProject, mainTargetUuid, 'PBXSourcesBuildPhase')
    if (!mainSourcesPhase) {
      xcodeProject.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', mainTargetUuid, folderType, buildPath)
      mainSourcesPhase = findTargetPhaseByType(xcodeProject, mainTargetUuid, 'PBXSourcesBuildPhase')
    }
    if (mainSourcesPhase) {
      ensureBuildPhaseFiles(xcodeProject, mainSourcesPhase, options.mainSwiftFiles, targetName)
    }
  }

  // Copy files build phase (embed extension into main app) — the embed phase is matched purely by
  // its `dstSubfolderSpec == 13` semantics, both before and after creation
  let copyFilesPhase = findExistingEmbedExtensionsPhase(xcodeProject, mainTargetUuid)
  if (!copyFilesPhase) {
    xcodeProject.addBuildPhase([], 'PBXCopyFilesBuildPhase', groupName, mainTargetUuid, folderType, buildPath)
    copyFilesPhase = findExistingEmbedExtensionsPhase(xcodeProject, mainTargetUuid)
  }
  if (copyFilesPhase) {
    ensureCopyFilesPhaseProduct(xcodeProject, copyFilesPhase, productFile)
  }

  // Frameworks build phase
  const frameworksPhase = findTargetPhaseByType(xcodeProject, targetUuid, 'PBXFrameworksBuildPhase')
  if (!frameworksPhase) {
    xcodeProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', targetUuid, folderType, buildPath)
  }

  // Resources build phase
  let resourcesPhase = findTargetPhaseByType(xcodeProject, targetUuid, 'PBXResourcesBuildPhase')
  if (!resourcesPhase) {
    xcodeProject.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', targetUuid)
    resourcesPhase = findTargetPhaseByType(xcodeProject, targetUuid, 'PBXResourcesBuildPhase')
  }
  if (resourcesPhase) {
    ensureBuildPhaseFiles(xcodeProject, resourcesPhase, resourcePaths, targetName)
  }
}

/**
 * Drops duplicate build phases of one pbx section type from a target, keeping the first phase in
 * the target's `buildPhases` order. Membership in the type's object section is the only criterion —
 * comments are decorative and other tools strip them. De-referenced phase objects are deleted so no
 * orphans remain.
 */
function dedupeBuildPhasesForTarget(xcodeProject: XcodeProject, targetUuid: string, phaseType: string): void {
  const nativeTargets = xcodeProject.pbxNativeTargetSection()
  const target = nativeTargets[targetUuid]
  if (!target?.buildPhases) {
    return
  }

  const phaseSection = xcodeProject.hash.project.objects[phaseType] || {}
  const matching = target.buildPhases.filter((entry: any) => phaseSection[normalizeRef(entry.value)])
  if (matching.length <= 1) {
    return
  }

  const keep = matching[0]
  const removed = matching.filter((entry: any) => entry.value !== keep.value)
  target.buildPhases = target.buildPhases.filter((entry: any) => {
    if (!phaseSection[normalizeRef(entry.value)]) {
      return true
    }
    return entry.value === keep.value
  })
  deleteOrphanPhaseObjects(phaseSection, removed)
}

/**
 * Drops duplicate embed-app-extensions copy-files phases (`dstSubfolderSpec == 13`) from a target,
 * keeping the first one in the target's `buildPhases` order. Other copy-files phases (different
 * `dstSubfolderSpec`) are left untouched. De-referenced phase objects are deleted so no orphans
 * remain.
 */
function dedupeEmbedPhasesForTarget(xcodeProject: XcodeProject, targetUuid: string): void {
  const nativeTargets = xcodeProject.pbxNativeTargetSection()
  const target = nativeTargets[targetUuid]
  if (!target?.buildPhases) {
    return
  }

  const phaseSection = xcodeProject.hash.project.objects['PBXCopyFilesBuildPhase'] || {}
  const isEmbedEntry = (entry: any) => {
    const phase = phaseSection[normalizeRef(entry.value)]
    return phase && String(phase.dstSubfolderSpec) === '13'
  }

  const matching = target.buildPhases.filter(isEmbedEntry)
  if (matching.length <= 1) {
    return
  }

  const keep = matching[0]
  const removed = matching.filter((entry: any) => entry.value !== keep.value)
  target.buildPhases = target.buildPhases.filter((entry: any) => {
    if (!isEmbedEntry(entry)) {
      return true
    }
    return entry.value === keep.value
  })
  deleteOrphanPhaseObjects(phaseSection, removed)
}

/**
 * Deletes de-referenced build-phase objects (and their `_comment` keys) from a phase section, so
 * dropping duplicate phase refs from a target does not leave orphan objects that fail the
 * `[Xcodeproj]` consistency check.
 */
function deleteOrphanPhaseObjects(phaseSection: Record<string, any>, removedEntries: any[]): void {
  for (const entry of removedEntries) {
    const key = normalizeRef(entry.value)
    delete phaseSection[key]
    delete phaseSection[`${key}_comment`]
  }
}

/**
 * Resolves (or creates) the PBXBuildFile for a widget file within a specific build phase.
 *
 * The lookup is scoped to the given phase's `files`: a PBXBuildFile is only reused when it is
 * already part of THIS phase. This prevents adopting a build file that belongs to another target's
 * phase — the same PBXFileReference (e.g. an asset catalog) may legitimately need its own build
 * file per phase, and sharing one produces the "no parent for object" corruption (issue #87). When
 * no match exists a new PBXBuildFile with a fresh UUID is created.
 */
function ensureBuildFile(xcodeProject: XcodeProject, filePath: string, buildPhase: any, targetName: string) {
  const fileRef = ensureWidgetFileReference(xcodeProject, filePath, targetName)
  const file = new pbxFile(filePath)

  if (buildPhase?.files) {
    const buildFileSection = xcodeProject.pbxBuildFileSection()
    const existingInPhase = buildPhase.files.find((entry: any) => {
      const buildFile = buildFileSection[normalizeRef(entry.value)]
      return buildFile?.fileRef === fileRef
    })
    if (existingInPhase) {
      return { uuid: normalizeRef(existingInPhase.value), fileRef, basename: file.basename, group: file.group }
    }
  }

  const uuid = xcodeProject.generateUuid()
  xcodeProject.addToPbxBuildFileSection({ uuid, fileRef, basename: file.basename, group: file.group } as any)
  return { uuid, fileRef, basename: file.basename, group: file.group }
}

function buildPhaseHasFile(xcodeProject: XcodeProject, buildPhase: any, fileRef: string): boolean {
  if (!buildPhase?.files) {
    return false
  }
  const buildFileSection = xcodeProject.pbxBuildFileSection()

  return buildPhase.files.some((entry: any) => {
    const buildFile = buildFileSection[normalizeRef(entry.value)]
    return buildFile?.fileRef === fileRef
  })
}

function ensureBuildPhaseFiles(
  xcodeProject: XcodeProject,
  buildPhase: any,
  filePaths: string[],
  targetName: string
): void {
  if (!buildPhase.files) {
    buildPhase.files = []
  }

  for (const filePath of filePaths) {
    const fileRef = ensureWidgetFileReference(xcodeProject, filePath, targetName)
    if (buildPhaseHasFile(xcodeProject, buildPhase, fileRef)) {
      continue
    }

    const buildFile = ensureBuildFile(xcodeProject, filePath, buildPhase, targetName)
    buildPhase.files.push({
      value: buildFile.uuid,
      comment: util.format('%s in %s', buildFile.basename, buildFile.group),
    })
  }
}

function ensureCopyFilesPhaseProduct(xcodeProject: XcodeProject, buildPhase: any, productFile: any): void {
  if (!buildPhase.files) {
    buildPhase.files = []
  }

  const buildFileSection = xcodeProject.pbxBuildFileSection()
  const alreadyInPhase = buildPhase.files.some((entry: any) => {
    const buildFile = buildFileSection[normalizeRef(entry.value)]
    return buildFile?.fileRef === productFile.fileRef
  })
  if (alreadyInPhase) {
    return
  }

  // Reuse the product's build-file UUID only if it isn't already registered by another phase;
  // otherwise mint a fresh UUID so the two phases never share one PBXBuildFile (issue #87).
  let useUuid = productFile.uuid
  if (buildFileSection[productFile.uuid]) {
    useUuid = xcodeProject.generateUuid()
    xcodeProject.addToPbxBuildFileSection({ ...productFile, uuid: useUuid })
  } else {
    xcodeProject.addToPbxBuildFileSection(productFile)
  }

  buildPhase.files.push({
    value: useUuid,
    comment: util.format('%s in %s', productFile.basename, productFile.group),
  })
}
