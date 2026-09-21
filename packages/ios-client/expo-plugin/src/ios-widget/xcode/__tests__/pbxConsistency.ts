import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const xcode = require('xcode')

/** pbxproj build-phase sections whose `files` entries point at PBXBuildFile objects. */
const BUILD_PHASE_SECTIONS = [
  'PBXSourcesBuildPhase',
  'PBXFrameworksBuildPhase',
  'PBXResourcesBuildPhase',
  'PBXCopyFilesBuildPhase',
  'PBXHeadersBuildPhase',
  'PBXShellScriptBuildPhase',
]

const COMMENT_KEY = /_comment$/

function nonCommentKeys(section: Record<string, any> | undefined): string[] {
  if (!section) {
    return []
  }
  return Object.keys(section).filter((key) => !COMMENT_KEY.test(key))
}

/** Strips a trailing `/* comment *\/` and surrounding whitespace from a raw pbx reference value. */
function normalizeRef(value: unknown): string {
  return String(value)
    .replace(/\/\*.*?\*\//g, '')
    .trim()
}

/**
 * Loads a checked-in pbxproj fixture and returns a freshly parsed xcode project.
 */
export function loadFixtureProject(fixtureName: string): any {
  const fixturePath = path.join(__dirname, '..', '__fixtures__', fixtureName)
  const project = xcode.project(fixturePath)
  project.parseSync()
  return project
}

/**
 * Serializes the project and parses the result back, asserting the pbxproj survives a
 * `writeSync()` round-trip. Returns the re-parsed project.
 */
export function roundTripProject(project: any): any {
  const contents = project.writeSync()
  const tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pbx-')), 'project.pbxproj')
  fs.writeFileSync(tmpFile, contents)
  const reparsed = xcode.project(tmpFile)
  reparsed.parseSync()
  return reparsed
}

/**
 * Asserts the structural consistency of a parsed Xcode project, mirroring the invariants CocoaPods'
 * `[Xcodeproj]` consistency checker enforces. Throws on the first violation.
 *
 * Checks:
 * - every phase `files` entry resolves to an existing PBXBuildFile
 * - every PBXBuildFile is referenced by exactly one build phase across the whole project
 * - the main app target has exactly one `dstSubfolderSpec == 13` copy-files phase
 * - no orphan phase objects (every phase object is referenced by some native target)
 * - the project survives a `writeSync()` -> re-parse round-trip
 */
export function assertPbxConsistency(project: any): void {
  const objects = project.hash.project.objects
  const buildFileSection = objects.PBXBuildFile || {}

  // Collect every phase object referenced by a native target.
  const nativeTargets = objects.PBXNativeTarget || {}
  const referencedPhaseUuids = new Set<string>()
  for (const targetKey of nonCommentKeys(nativeTargets)) {
    const target = nativeTargets[targetKey]
    for (const entry of target.buildPhases || []) {
      referencedPhaseUuids.add(normalizeRef(entry.value))
    }
  }

  // Walk every build phase, resolving each files entry and counting build-file references.
  const buildFileRefCount = new Map<string, number>()
  for (const sectionName of BUILD_PHASE_SECTIONS) {
    const section = objects[sectionName]
    for (const phaseKey of nonCommentKeys(section)) {
      // Orphan phase: exists in the object graph but no target references it.
      if (!referencedPhaseUuids.has(phaseKey)) {
        throw new Error(`Orphan ${sectionName} object '${phaseKey}' is not referenced by any target`)
      }

      const phase = section[phaseKey]
      for (const entry of phase.files || []) {
        const buildFileUuid = normalizeRef(entry.value)
        if (!buildFileSection[buildFileUuid]) {
          throw new Error(
            `${sectionName} '${phaseKey}' references build file '${buildFileUuid}' that has no PBXBuildFile object`
          )
        }
        buildFileRefCount.set(buildFileUuid, (buildFileRefCount.get(buildFileUuid) ?? 0) + 1)
      }
    }
  }

  // Every PBXBuildFile must be referenced by exactly one phase.
  for (const buildFileUuid of nonCommentKeys(buildFileSection)) {
    const count = buildFileRefCount.get(buildFileUuid) ?? 0
    if (count !== 1) {
      const comment = buildFileSection[`${buildFileUuid}_comment`] ?? buildFileUuid
      throw new Error(
        `PBXBuildFile '${comment}' (${buildFileUuid}) is referenced by ${count} build phases, expected exactly 1`
      )
    }
  }

  // Exactly one embed-app-extensions (dstSubfolderSpec == 13) phase on the main target.
  const mainTargetUuid = project.getFirstTarget().uuid
  const mainTarget = nativeTargets[mainTargetUuid]
  const copyFilesSection = objects.PBXCopyFilesBuildPhase || {}
  const embedPhases = (mainTarget.buildPhases || []).filter((entry: any) => {
    const phase = copyFilesSection[normalizeRef(entry.value)]
    return phase && String(phase.dstSubfolderSpec) === '13'
  })
  if (embedPhases.length !== 1) {
    throw new Error(`Main target has ${embedPhases.length} embed-app-extensions phases, expected exactly 1`)
  }

  // The project must survive serialization + re-parse.
  roundTripProject(project)
}
