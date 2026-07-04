import type { IOSWidgetExtensionFiles } from '../../types'
import { assertPbxConsistency, loadFixtureProject } from './__tests__/pbxConsistency'
import { applyXcodeChanges, ConfigureXcodeProjectProps } from './index'

const PROPS: ConfigureXcodeProjectProps = {
  targetName: 'VoltraWidgetExtension',
  bundleIdentifier: 'com.voltra.example.VoltraWidgetExtension',
  deploymentTarget: '16.2',
}

// Mirrors what getIOSWidgetExtensionFiles returns for a real widget. Crucially `Assets.xcassets`
// collides by bare path with the pre-existing extension's asset catalog in fixture (b) — the exact
// shape that triggered issues #87/#32.
const WIDGET_FILES: IOSWidgetExtensionFiles = {
  swiftFiles: ['VoltraWidget.swift', 'VoltraWidgetInitialStates.swift'],
  entitlementFiles: ['VoltraWidgetExtension.entitlements'],
  plistFiles: ['VoltraWidgetExtension-Info.plist'],
  assetDirectories: ['Assets.xcassets'],
  intentFiles: [],
  localizedStringResources: ['en.lproj/VoltraWidgets.strings'],
}

/**
 * Replaces the project's random UUID generator with a deterministic counter so serialized output is
 * stable across runs (needed for snapshots and for asserting an idempotent run allocates no new
 * UUIDs). The prefix cannot collide with the hand-written fixture UUIDs.
 */
function useDeterministicUuids(project: any): void {
  let counter = 0
  project.generateUuid = () => {
    counter += 1
    return `F1D0${counter.toString(16).toUpperCase().padStart(20, '0')}`
  }
}

describe('applyXcodeChanges — fresh Expo project (fixture a)', () => {
  it('produces a consistent project', () => {
    const project = loadFixtureProject('fresh.pbxproj')
    useDeterministicUuids(project)

    applyXcodeChanges(project, PROPS, WIDGET_FILES)

    expect(() => assertPbxConsistency(project)).not.toThrow()
  })

  it('is idempotent — a second/third run stays consistent and allocates nothing new', () => {
    const project = loadFixtureProject('fresh.pbxproj')
    useDeterministicUuids(project)

    applyXcodeChanges(project, PROPS, WIDGET_FILES)
    applyXcodeChanges(project, PROPS, WIDGET_FILES)
    const afterSecond = project.writeSync()
    applyXcodeChanges(project, PROPS, WIDGET_FILES)
    const afterThird = project.writeSync()

    expect(() => assertPbxConsistency(project)).not.toThrow()
    expect(afterThird).toEqual(afterSecond)
  })

  it('matches the committed snapshot', () => {
    const project = loadFixtureProject('fresh.pbxproj')
    useDeterministicUuids(project)

    applyXcodeChanges(project, PROPS, WIDGET_FILES)

    expect(project.writeSync()).toMatchSnapshot()
  })
})

describe('applyXcodeChanges — project with a pre-existing extension (fixture b, issues #87/#32)', () => {
  it('produces a consistent project (no PBXBuildFile stealing, single embed phase)', () => {
    const project = loadFixtureProject('with-existing-extension.pbxproj')
    useDeterministicUuids(project)

    applyXcodeChanges(project, PROPS, WIDGET_FILES)

    expect(() => assertPbxConsistency(project)).not.toThrow()
  })

  it('reuses the existing "Embed App Extensions" phase instead of adding a second', () => {
    const project = loadFixtureProject('with-existing-extension.pbxproj')
    useDeterministicUuids(project)

    applyXcodeChanges(project, PROPS, WIDGET_FILES)

    const objects = project.hash.project.objects
    const mainTargetUuid = project.getFirstTarget().uuid
    const copyFilesSection = objects.PBXCopyFilesBuildPhase || {}
    const embedPhases = objects.PBXNativeTarget[mainTargetUuid].buildPhases.filter((entry: any) => {
      const phase =
        copyFilesSection[
          String(entry.value)
            .replace(/\/\*.*?\*\//g, '')
            .trim()
        ]
      return phase && String(phase.dstSubfolderSpec) === '13'
    })
    expect(embedPhases).toHaveLength(1)
  })

  it('gives the widget its own Assets.xcassets file reference, not the extension’s', () => {
    const project = loadFixtureProject('with-existing-extension.pbxproj')
    useDeterministicUuids(project)

    applyXcodeChanges(project, PROPS, WIDGET_FILES)

    const fileRefs = project.hash.project.objects.PBXFileReference
    const assetRefs = Object.keys(fileRefs)
      .filter((key) => !/_comment$/.test(key))
      .filter((key) => {
        const p = typeof fileRefs[key].path === 'string' ? fileRefs[key].path.replace(/^"|"$/g, '') : ''
        return p === 'Assets.xcassets'
      })
    // One for the pre-existing extension, one freshly created for the widget.
    expect(assetRefs.length).toBeGreaterThanOrEqual(2)
  })

  it('is idempotent — a second/third run stays consistent and allocates nothing new', () => {
    const project = loadFixtureProject('with-existing-extension.pbxproj')
    useDeterministicUuids(project)

    applyXcodeChanges(project, PROPS, WIDGET_FILES)
    applyXcodeChanges(project, PROPS, WIDGET_FILES)
    const afterSecond = project.writeSync()
    applyXcodeChanges(project, PROPS, WIDGET_FILES)
    const afterThird = project.writeSync()

    expect(() => assertPbxConsistency(project)).not.toThrow()
    expect(afterThird).toEqual(afterSecond)
  })
})

/** Resolves the widget target's build settings keyed by configuration name. */
function widgetBuildSettingsByConfigName(project: any): Record<string, Record<string, string>> {
  const objects = project.hash.project.objects
  const targetKey = project.findTargetKey(PROPS.targetName)
  const listId = String(objects.PBXNativeTarget[targetKey].buildConfigurationList).split(' ')[0]
  const configRefs = objects.XCConfigurationList[listId].buildConfigurations

  const result: Record<string, Record<string, string>> = {}
  for (const ref of configRefs) {
    const configId = typeof ref === 'string' ? ref.split(' ')[0] : ref.value.split(' ')[0]
    const config = objects.XCBuildConfiguration[configId]
    result[String(config.name).replace(/^"|"$/g, '')] = config.buildSettings
  }
  return result
}

describe('applyXcodeChanges — per-configuration code signing (fixture c)', () => {
  it('maps main app Debug signing to widget Debug and Release to Release', () => {
    const project = loadFixtureProject('with-per-config-signing.pbxproj')
    useDeterministicUuids(project)

    applyXcodeChanges(project, PROPS, WIDGET_FILES)

    const settings = widgetBuildSettingsByConfigName(project)
    expect(settings.Debug.PROVISIONING_PROFILE_SPECIFIER).toBe('"Voltra Dev Profile"')
    expect(settings.Release.PROVISIONING_PROFILE_SPECIFIER).toBe('"Voltra AppStore Profile"')
    expect(settings.Debug.DEVELOPMENT_TEAM).toBe('"ABCDE12345"')
    expect(settings.Release.DEVELOPMENT_TEAM).toBe('"ABCDE12345"')
    expect(settings.Debug.CODE_SIGN_STYLE).toBe('"Manual"')
    expect(settings.Release.CODE_SIGN_STYLE).toBe('"Manual"')

    expect(() => assertPbxConsistency(project)).not.toThrow()
  })

  it('keeps the per-config mapping on an idempotent re-run (existing-target path)', () => {
    const project = loadFixtureProject('with-per-config-signing.pbxproj')
    useDeterministicUuids(project)

    applyXcodeChanges(project, PROPS, WIDGET_FILES)
    applyXcodeChanges(project, PROPS, WIDGET_FILES)

    const settings = widgetBuildSettingsByConfigName(project)
    expect(settings.Debug.PROVISIONING_PROFILE_SPECIFIER).toBe('"Voltra Dev Profile"')
    expect(settings.Release.PROVISIONING_PROFILE_SPECIFIER).toBe('"Voltra AppStore Profile"')

    expect(() => assertPbxConsistency(project)).not.toThrow()
  })
})

describe('applyXcodeChanges — version passthrough', () => {
  const VERSIONED_PROPS: ConfigureXcodeProjectProps = {
    ...PROPS,
    version: '3.2.1',
    buildNumber: '42',
  }

  it('applies MARKETING_VERSION and CURRENT_PROJECT_VERSION to both Debug and Release', () => {
    const project = loadFixtureProject('fresh.pbxproj')
    useDeterministicUuids(project)

    applyXcodeChanges(project, VERSIONED_PROPS, WIDGET_FILES)

    const settings = widgetBuildSettingsByConfigName(project)
    expect(settings.Debug.MARKETING_VERSION).toBe('"3.2.1"')
    expect(settings.Release.MARKETING_VERSION).toBe('"3.2.1"')
    expect(settings.Debug.CURRENT_PROJECT_VERSION).toBe('"42"')
    expect(settings.Release.CURRENT_PROJECT_VERSION).toBe('"42"')

    expect(() => assertPbxConsistency(project)).not.toThrow()
  })

  it('falls back to "1.0"/"1" when version and buildNumber are not provided', () => {
    const project = loadFixtureProject('fresh.pbxproj')
    useDeterministicUuids(project)

    applyXcodeChanges(project, PROPS, WIDGET_FILES)

    const settings = widgetBuildSettingsByConfigName(project)
    expect(settings.Debug.MARKETING_VERSION).toBe('"1.0"')
    expect(settings.Release.MARKETING_VERSION).toBe('"1.0"')
    expect(settings.Debug.CURRENT_PROJECT_VERSION).toBe('"1"')
    expect(settings.Release.CURRENT_PROJECT_VERSION).toBe('"1"')
  })
})
