import { ensureWidgetBundleScriptPhase } from './buildPhases'

// The xcode lib normally parses a .pbxproj from disk; for a unit test we build the minimal hash
// the real methods touch (native target + the file/build-file sections addBuildPhase reads) and
// exercise the actual library code rather than a mock.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const xcode = require('xcode')

const TARGET_UUID = 'A'.repeat(24)
const MAIN_TARGET_UUID = 'D'.repeat(24)

function makeProject() {
  const project = xcode.project('/noop.pbxproj')
  project.hash = {
    project: {
      objects: {
        PBXNativeTarget: { [TARGET_UUID]: { buildPhases: [] } },
        PBXFileReference: {},
        PBXBuildFile: {},
      },
    },
  }
  return project
}

function makeTwoTargetProject() {
  const project = makeProject()
  project.hash.project.objects.PBXNativeTarget[MAIN_TARGET_UUID] = { buildPhases: [] }
  return project
}

function targetPhases(project: any, targetUuid: string): any[] {
  const section = project.hash.project.objects.PBXShellScriptBuildPhase || {}
  return project.hash.project.objects.PBXNativeTarget[targetUuid].buildPhases.map((entry: any) => section[entry.value])
}

function shellPhaseObjects(project: any): any[] {
  const section = project.hash.project.objects.PBXShellScriptBuildPhase || {}
  return Object.keys(section)
    .filter((key) => !/_comment$/.test(key))
    .map((key) => section[key])
}

describe('ensureWidgetBundleScriptPhase', () => {
  it('adds a release-only widget-bundling shell phase to the target', () => {
    const project = makeProject()
    ensureWidgetBundleScriptPhase(project, TARGET_UUID)

    const phases = shellPhaseObjects(project)
    expect(phases).toHaveLength(1)

    const phase = phases[0]
    expect(phase.name).toContain('Bundle Voltra Dynamic Content')
    expect(phase.shellScript).toContain('@use-voltra/metro/bundle-widgets')
    // Debug builds use Metro, so the script must skip them...
    expect(phase.shellScript).toContain('Debug')
    // ...and bake into the extension's resources dir in release.
    expect(phase.shellScript).toContain('UNLOCALIZED_RESOURCES_FOLDER_PATH')
    // Re-bakes every release build (can't enumerate widget-source inputs) without warning.
    expect(phase.alwaysOutOfDate).toBe(1)

    // Phase is attached to the (extension) target.
    expect(project.hash.project.objects.PBXNativeTarget[TARGET_UUID].buildPhases).toHaveLength(1)
  })

  it('is idempotent — re-running does not add a second phase', () => {
    const project = makeProject()
    ensureWidgetBundleScriptPhase(project, TARGET_UUID)
    ensureWidgetBundleScriptPhase(project, TARGET_UUID)

    expect(shellPhaseObjects(project)).toHaveLength(1)
    expect(project.hash.project.objects.PBXNativeTarget[TARGET_UUID].buildPhases).toHaveLength(1)
  })

  it('migrates the legacy phase name without leaving a duplicate phase behind', () => {
    const project = makeProject()
    const legacyUuid = 'C'.repeat(24)
    project.hash.project.objects.PBXShellScriptBuildPhase = {
      [legacyUuid]: { name: '"Bundle Voltra Dynamic Widgets"', shellScript: 'legacy' },
    }
    project.hash.project.objects.PBXNativeTarget[TARGET_UUID].buildPhases = [{ value: legacyUuid }]

    ensureWidgetBundleScriptPhase(project, TARGET_UUID, 'live-activities')

    const phases = shellPhaseObjects(project)
    expect(phases).toHaveLength(1)
    expect(phases[0].name).toBe('"Bundle Voltra Dynamic Content"')
    expect(phases[0].shellScript).toContain('--content live-activities')
  })

  it('does nothing when the target is absent', () => {
    const project = makeProject()
    ensureWidgetBundleScriptPhase(project, 'B'.repeat(24))
    expect(shellPhaseObjects(project)).toHaveLength(0)
  })

  describe('with an extension and a main app target', () => {
    function expectOwnContent(project: any) {
      const extensionPhases = targetPhases(project, TARGET_UUID)
      const mainPhases = targetPhases(project, MAIN_TARGET_UUID)
      expect(extensionPhases).toHaveLength(1)
      expect(mainPhases).toHaveLength(1)
      expect(extensionPhases[0].shellScript).toContain('--content all')
      expect(extensionPhases[0].shellScript).not.toContain('--content live-activities')
      expect(mainPhases[0].shellScript).toContain('--content live-activities')
      expect(mainPhases[0].shellScript).not.toContain('--content all')
      expect(shellPhaseObjects(project)).toHaveLength(2)
    }

    it('keeps each target on its own content (extension first)', () => {
      const project = makeTwoTargetProject()
      ensureWidgetBundleScriptPhase(project, TARGET_UUID, 'all')
      ensureWidgetBundleScriptPhase(project, MAIN_TARGET_UUID, 'live-activities')
      expectOwnContent(project)
    })

    it('keeps each target on its own content (main app first)', () => {
      const project = makeTwoTargetProject()
      ensureWidgetBundleScriptPhase(project, MAIN_TARGET_UUID, 'live-activities')
      ensureWidgetBundleScriptPhase(project, TARGET_UUID, 'all')
      expectOwnContent(project)
    })

    it('is idempotent across repeated runs', () => {
      const project = makeTwoTargetProject()
      for (let i = 0; i < 2; i++) {
        ensureWidgetBundleScriptPhase(project, TARGET_UUID, 'all')
        ensureWidgetBundleScriptPhase(project, MAIN_TARGET_UUID, 'live-activities')
      }
      expectOwnContent(project)
    })
  })
})
