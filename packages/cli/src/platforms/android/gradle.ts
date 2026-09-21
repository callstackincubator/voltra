import path from 'node:path'

import { normalizeRelativePath, toRelativePath } from '../../fs/path'
import { readTextFile, writeTextFile } from '../../fs/readWrite'

import type { AndroidProjectDiscovery } from '../../discovery/android'
import type { ReportedChange } from '../../reporting/summary'

const MARKER = '// @voltra-widget-bundling'
const END_MARKER = '// @voltra-widget-bundling-end'

export interface EnsureAndroidGradleWidgetBundlingOptions {
  projectRoot: string
  discovery: AndroidProjectDiscovery
  hasDynamicWidgets: boolean
}

export interface EnsureAndroidGradleWidgetBundlingResult {
  change?: ReportedChange
  warnings?: string[]
}

export async function ensureAndroidGradleWidgetBundling(
  options: EnsureAndroidGradleWidgetBundlingOptions
): Promise<EnsureAndroidGradleWidgetBundlingResult> {
  const { projectRoot, discovery, hasDynamicWidgets } = options
  const isKotlinDsl = discovery.buildGradlePath.endsWith('.kts')
  const projectRootRelativeToAppModule =
    normalizeRelativePath(path.relative(discovery.appModuleRoot, projectRoot)) || '.'

  if (isKotlinDsl) {
    if (!hasDynamicWidgets) {
      return {}
    }

    return {
      warnings: ['Voltra: app/build.gradle is not Groovy - skipping Dynamic Widget release bundling wiring.'],
    }
  }

  const previousContent = await readTextFile(discovery.buildGradlePath)
  const removal = removeDynamicWidgetBundlingSnippet(previousContent, projectRootRelativeToAppModule)
  const nextContent = hasDynamicWidgets
    ? addDynamicWidgetBundlingSnippet(removal.contents, projectRootRelativeToAppModule)
    : removal.contents

  if (nextContent === previousContent) {
    return removal.warning ? { warnings: [removal.warning] } : {}
  }

  await writeTextFile(discovery.buildGradlePath, nextContent)

  return {
    change: {
      kind: 'updated',
      path: toRelativePath(projectRoot, discovery.buildGradlePath),
    },
    warnings: removal.warning ? [removal.warning] : undefined,
  }
}

export function addDynamicWidgetBundlingSnippet(contents: string, projectRootRelativeToAppModule: string): string {
  if (contents.includes(MARKER)) {
    return contents
  }

  return `${contents.trimEnd()}\n\n${createDynamicWidgetBundlingSnippet(projectRootRelativeToAppModule)}\n`
}

export function removeDynamicWidgetBundlingSnippet(
  contents: string,
  projectRootRelativeToAppModule: string
): { contents: string; warning?: string } {
  const range = findManagedSnippetRange(contents)

  if (range) {
    return {
      contents: collapseRemovedRange(contents, range.start, range.end),
    }
  }

  const legacySnippet = createLegacyDynamicWidgetBundlingSnippet(projectRootRelativeToAppModule)
  const legacyIndex = contents.indexOf(legacySnippet)

  if (legacyIndex >= 0) {
    return {
      contents: collapseRemovedRange(contents, legacyIndex, legacyIndex + legacySnippet.length),
    }
  }

  if (!contents.includes(MARKER)) {
    return { contents }
  }

  return {
    contents,
    warning:
      'Voltra: found legacy Dynamic Widget Gradle marker without managed end marker. Preserved trailing Gradle content; remove old @voltra-widget-bundling block manually if no longer needed.',
  }
}

function createDynamicWidgetBundlingSnippet(projectRootRelativeToAppModule: string): string {
  return `
${MARKER}
def voltraProjectRoot = file("${projectRootRelativeToAppModule}")
def voltraWidgetAssetsDir = file("\${buildDir}/generated/voltra/assets")
android.sourceSets.getByName("main").assets.srcDir(voltraWidgetAssetsDir)

def voltraBundleWidgets = tasks.register("voltraBundleWidgets", Exec) {
    description = "Bake Dynamic Widget Voltra bundles into assets (release)."
    workingDir voltraProjectRoot
    environment "VOLTRA_PROJECT_ROOT", voltraProjectRoot.absolutePath
    environment "VOLTRA_OUT_DIR", new File(voltraWidgetAssetsDir, "voltra").absolutePath
    environment "VOLTRA_BUNDLER_RESOLVER", "const m=require('module'),p=require('path');process.stdout.write(m.createRequire(p.join(process.argv[1],'package.json')).resolve('@use-voltra/metro/bundle-widgets'))"
    commandLine "bash", "-c", 'BUNDLER="$(node -e "$VOLTRA_BUNDLER_RESOLVER" "$VOLTRA_PROJECT_ROOT")"; if [ -z "$BUNDLER" ]; then echo "error: Voltra could not resolve @use-voltra/metro/bundle-widgets from $VOLTRA_PROJECT_ROOT - install @use-voltra/metro so release widgets can be baked." >&2; exit 1; fi; node "$BUNDLER" --platform android --out-dir "$VOLTRA_OUT_DIR" --project-root "$VOLTRA_PROJECT_ROOT"'
    outputs.upToDateWhen { false }
}

android.applicationVariants.all { variant ->
    if (variant.buildType.name == "release") {
        tasks.named("merge\${variant.name.capitalize()}Assets").configure { dependsOn voltraBundleWidgets }
    }
}
${END_MARKER}
`.trim()
}

function createLegacyDynamicWidgetBundlingSnippet(projectRootRelativeToAppModule: string): string {
  return createDynamicWidgetBundlingSnippet(projectRootRelativeToAppModule).replace(`\n${END_MARKER}`, '')
}

function findManagedSnippetRange(contents: string): { start: number; end: number } | null {
  const markerIndex = contents.indexOf(MARKER)
  if (markerIndex < 0) {
    return null
  }

  const endMarkerIndex = contents.indexOf(END_MARKER, markerIndex)
  if (endMarkerIndex < 0) {
    return null
  }

  const lineEndIndex = contents.indexOf('\n', endMarkerIndex)
  return {
    start: markerIndex,
    end: lineEndIndex >= 0 ? lineEndIndex + 1 : contents.length,
  }
}

function collapseRemovedRange(contents: string, start: number, end: number): string {
  const before = contents.slice(0, start).trimEnd()
  const after = contents.slice(end).replace(/^\s+/, '')
  const merged = [before, after].filter(Boolean).join('\n\n')
  return merged ? `${merged}\n` : ''
}
