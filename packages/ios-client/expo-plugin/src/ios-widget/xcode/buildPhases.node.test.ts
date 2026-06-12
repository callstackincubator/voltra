import { ensureWidgetBundleScriptPhase } from './buildPhases'

// The xcode lib normally parses a .pbxproj from disk; for a unit test we build the minimal hash
// the real methods touch (native target + the file/build-file sections addBuildPhase reads) and
// exercise the actual library code rather than a mock.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const xcode = require('xcode')

const TARGET_UUID = 'A'.repeat(24)

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
    expect(phase.name).toContain('Bundle Voltra client widgets')
    expect(phase.shellScript).toContain('bundleWidgets.js')
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

  it('does nothing when the target is absent', () => {
    const project = makeProject()
    ensureWidgetBundleScriptPhase(project, 'B'.repeat(24))
    expect(shellPhaseObjects(project)).toHaveLength(0)
  })
})
