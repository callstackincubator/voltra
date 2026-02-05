import { XcodeProject } from '@expo/config-plugins'
import * as util from 'util'

import type { WidgetFiles } from '../../types'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pbxFile = require('xcode/lib/pbxFile')

export interface AddBuildPhasesOptions {
  targetUuid: string
  groupName: string
  productFile: {
    uuid: string
    target?: string
    basename: string
    group: string
  }
  widgetFiles: WidgetFiles
}

export interface EnsureBuildPhasesOptions extends AddBuildPhasesOptions {
  mainTargetUuid?: string
}

/**
 * Adds all required build phases for the widget extension target.
 */
export function addBuildPhases(xcodeProject: XcodeProject, options: AddBuildPhasesOptions): void {
  const { targetUuid, groupName, productFile, widgetFiles } = options
  const buildPath = `""`
  const folderType = 'app_extension'

  const { swiftFiles, intentFiles, assetDirectories } = widgetFiles

  // Sources build phase
  xcodeProject.addBuildPhase(
    [...swiftFiles, ...intentFiles],
    'PBXSourcesBuildPhase',
    'Sources',
    targetUuid,
    folderType,
    buildPath
  )

  // Copy files build phase
  xcodeProject.addBuildPhase(
    [],
    'PBXCopyFilesBuildPhase',
    groupName,
    xcodeProject.getFirstTarget().uuid,
    folderType,
    buildPath
  )

  xcodeProject.buildPhaseObject('PBXCopyFilesBuildPhase', groupName, productFile.target).files.push({
    value: productFile.uuid,
    comment: util.format('%s in %s', productFile.basename, productFile.group),
  })
  xcodeProject.addToPbxBuildFileSection(productFile)

  // Frameworks build phase
  xcodeProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', targetUuid, folderType, buildPath)

  // Resources build phase
  xcodeProject.addBuildPhase([...assetDirectories], 'PBXResourcesBuildPhase', 'Resources', targetUuid)
}

/**
 * Ensures all required build phases and files exist for the widget extension target.
 */
export function ensureBuildPhases(xcodeProject: XcodeProject, options: EnsureBuildPhasesOptions): void {
  const { targetUuid, groupName, productFile, widgetFiles } = options
  const buildPath = `""`
  const folderType = 'app_extension'
  const mainTargetUuid = options.mainTargetUuid ?? xcodeProject.getFirstTarget().uuid

  const { swiftFiles, intentFiles, assetDirectories } = widgetFiles

  dedupeBuildPhasesForTarget(xcodeProject, targetUuid, 'PBXSourcesBuildPhase', 'Sources')
  dedupeBuildPhasesForTarget(xcodeProject, targetUuid, 'PBXFrameworksBuildPhase', 'Frameworks')
  dedupeBuildPhasesByComment(xcodeProject, mainTargetUuid, 'PBXCopyFilesBuildPhase', groupName)

  // Sources build phase
  let sourcesPhase = xcodeProject.buildPhaseObject('PBXSourcesBuildPhase', 'Sources', targetUuid)
  if (!sourcesPhase) {
    xcodeProject.addBuildPhase(
      [...swiftFiles, ...intentFiles],
      'PBXSourcesBuildPhase',
      'Sources',
      targetUuid,
      folderType,
      buildPath
    )
    sourcesPhase = xcodeProject.buildPhaseObject('PBXSourcesBuildPhase', 'Sources', targetUuid)
  }
  if (sourcesPhase) {
    ensureBuildPhaseFiles(xcodeProject, sourcesPhase, [...swiftFiles, ...intentFiles])
  }

  // Copy files build phase (embed extension into main app)
  let copyFilesPhase = xcodeProject.buildPhaseObject('PBXCopyFilesBuildPhase', groupName, mainTargetUuid)
  if (!copyFilesPhase) {
    xcodeProject.addBuildPhase([], 'PBXCopyFilesBuildPhase', groupName, mainTargetUuid, folderType, buildPath)
    copyFilesPhase = xcodeProject.buildPhaseObject('PBXCopyFilesBuildPhase', groupName, mainTargetUuid)
  }
  if (copyFilesPhase) {
    ensureCopyFilesPhaseProduct(xcodeProject, copyFilesPhase, productFile)
  }

  // Frameworks build phase
  const frameworksPhase = xcodeProject.buildPhaseObject('PBXFrameworksBuildPhase', 'Frameworks', targetUuid)
  if (!frameworksPhase) {
    xcodeProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', targetUuid, folderType, buildPath)
  }

  // Resources build phase
  let resourcesPhase = xcodeProject.buildPhaseObject('PBXResourcesBuildPhase', 'Resources', targetUuid)
  if (!resourcesPhase) {
    xcodeProject.addBuildPhase([...assetDirectories], 'PBXResourcesBuildPhase', 'Resources', targetUuid)
    resourcesPhase = xcodeProject.buildPhaseObject('PBXResourcesBuildPhase', 'Resources', targetUuid)
  }
  if (resourcesPhase) {
    ensureBuildPhaseFiles(xcodeProject, resourcesPhase, [...assetDirectories])
  }
}

function dedupeBuildPhasesForTarget(
  xcodeProject: XcodeProject,
  targetUuid: string,
  phaseType: string,
  preferredComment: string
): void {
  const nativeTargets = xcodeProject.pbxNativeTargetSection()
  const target = nativeTargets[targetUuid]
  if (!target?.buildPhases) {
    return
  }

  const phaseSection = xcodeProject.hash.project.objects[phaseType] || {}
  const matching = target.buildPhases.filter((entry: any) => phaseSection[entry.value])
  if (matching.length <= 1) {
    return
  }

  const keep = matching.find((entry: any) => entry.comment === preferredComment) ?? matching[0]
  keep.comment = preferredComment

  target.buildPhases = target.buildPhases.filter((entry: any) => {
    if (!phaseSection[entry.value]) {
      return true
    }
    return entry.value === keep.value
  })
}

function dedupeBuildPhasesByComment(
  xcodeProject: XcodeProject,
  targetUuid: string,
  phaseType: string,
  comment: string
): void {
  const nativeTargets = xcodeProject.pbxNativeTargetSection()
  const target = nativeTargets[targetUuid]
  if (!target?.buildPhases) {
    return
  }

  const phaseSection = xcodeProject.hash.project.objects[phaseType] || {}
  const matching = target.buildPhases.filter((entry: any) => phaseSection[entry.value] && entry.comment === comment)
  if (matching.length <= 1) {
    return
  }

  const keep = matching[0]
  target.buildPhases = target.buildPhases.filter((entry: any) => {
    if (!phaseSection[entry.value] || entry.comment !== comment) {
      return true
    }
    return entry.value === keep.value
  })
}

function normalizePath(value: string | undefined): string {
  if (!value) {
    return ''
  }
  return value.replace(/^"|"$/g, '')
}

function findFileReferenceKey(xcodeProject: XcodeProject, filePath: string): string | null {
  const fileReferenceSection = xcodeProject.pbxFileReferenceSection()
  const normalizedPath = normalizePath(filePath)

  for (const key of Object.keys(fileReferenceSection)) {
    if (/_comment$/.test(key)) {
      continue
    }
    const entry = fileReferenceSection[key]
    const entryPath = normalizePath(entry?.path)
    if (entryPath === normalizedPath) {
      return key
    }
  }

  return null
}

function findBuildFileKeyByFileRef(xcodeProject: XcodeProject, fileRef: string): string | null {
  const buildFileSection = xcodeProject.pbxBuildFileSection()
  for (const key of Object.keys(buildFileSection)) {
    if (/_comment$/.test(key)) {
      continue
    }
    const entry = buildFileSection[key]
    if (entry?.fileRef === fileRef) {
      return key
    }
  }
  return null
}

function ensureFileReference(xcodeProject: XcodeProject, filePath: string) {
  const existingFileRef = findFileReferenceKey(xcodeProject, filePath)
  const file = new pbxFile(filePath)

  if (existingFileRef) {
    return { fileRef: existingFileRef, basename: file.basename, group: file.group }
  }

  file.fileRef = xcodeProject.generateUuid()
  xcodeProject.addToPbxFileReferenceSection(file)
  return { fileRef: file.fileRef, basename: file.basename, group: file.group }
}

function ensureBuildFile(xcodeProject: XcodeProject, filePath: string) {
  const fileReference = ensureFileReference(xcodeProject, filePath)
  const existingBuildFile = findBuildFileKeyByFileRef(xcodeProject, fileReference.fileRef)

  if (existingBuildFile) {
    return { uuid: existingBuildFile, ...fileReference }
  }

  const file = new pbxFile(filePath)
  file.uuid = xcodeProject.generateUuid()
  file.fileRef = fileReference.fileRef
  xcodeProject.addToPbxBuildFileSection(file)
  return { uuid: file.uuid, ...fileReference, group: file.group }
}

function buildPhaseHasFile(xcodeProject: XcodeProject, buildPhase: any, fileRef: string): boolean {
  if (!buildPhase?.files) {
    return false
  }
  const buildFileSection = xcodeProject.pbxBuildFileSection()

  return buildPhase.files.some((entry: any) => {
    const buildFile = buildFileSection[entry.value]
    return buildFile?.fileRef === fileRef
  })
}

function ensureBuildPhaseFiles(xcodeProject: XcodeProject, buildPhase: any, filePaths: string[]): void {
  if (!buildPhase.files) {
    buildPhase.files = []
  }

  for (const filePath of filePaths) {
    const fileReference = ensureFileReference(xcodeProject, filePath)
    if (buildPhaseHasFile(xcodeProject, buildPhase, fileReference.fileRef)) {
      continue
    }

    const buildFile = ensureBuildFile(xcodeProject, filePath)
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

  const alreadyExists = buildPhase.files.some((entry: any) => entry.value === productFile.uuid)
  if (alreadyExists) {
    return
  }

  const buildFileSection = xcodeProject.pbxBuildFileSection()
  if (!buildFileSection[productFile.uuid]) {
    xcodeProject.addToPbxBuildFileSection(productFile)
  }

  buildPhase.files.push({
    value: productFile.uuid,
    comment: util.format('%s in %s', productFile.basename, productFile.group),
  })
}
