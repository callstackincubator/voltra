import { __test__ } from './gradle'

const { MARKER, addWidgetBundleGradle } = __test__

const BASE_GRADLE = `apply plugin: "com.android.application"

android {
    namespace "com.example.app"
}
`

describe('addWidgetBundleGradle', () => {
  it('appends the release widget-bundling wiring', () => {
    const result = addWidgetBundleGradle(BASE_GRADLE)
    expect(result).toContain(MARKER)
    expect(result).toContain('tasks.register("voltraBundleWidgets", Exec)')
    expect(result).toContain("resolve('@use-voltra/metro/bundle-widgets')")
    expect(result).toContain('--platform android')
    // release-gated + wired into the asset merge
    expect(result).toContain('variant.buildType.name == "release"')
    expect(result).toContain('merge${variant.name.capitalize()}Assets')
    // original contents preserved
    expect(result).toContain('apply plugin: "com.android.application"')
  })

  it('is idempotent — a second pass does not duplicate the snippet', () => {
    const once = addWidgetBundleGradle(BASE_GRADLE)
    const twice = addWidgetBundleGradle(once)
    expect(twice).toBe(once)
    expect(twice.match(new RegExp(MARKER.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'), 'g'))).toHaveLength(1)
  })
})
