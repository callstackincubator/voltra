import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import {
  type DynamicLiveActivityManifest,
  type DynamicLiveActivityManifestDefinition,
  validateWidgetEntry,
} from '@use-voltra/expo-plugin'

const MANIFEST_RELATIVE_PATH = '.voltra/manifest.ios.live-activities.json'

export type RegisteredVoltraLiveActivity = DynamicLiveActivityManifestDefinition & {
  platform: 'ios'
  manifestPath: string
  generatedEntryPath: string
  generatedEntryRelativePath: string
}

export type LiveActivityRegistry = {
  projectRoot: string
  getLiveActivity(definitionId: string): RegisteredVoltraLiveActivity | null
  isReady(): boolean
  listLiveActivities(): RegisteredVoltraLiveActivity[]
  close(): void
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/')
}

function writeFileIfChanged(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  try {
    if (fs.readFileSync(filePath, 'utf8') === content) return
  } catch {
    // Generated file does not exist yet.
  }
  fs.writeFileSync(filePath, content)
}

function hash(value: string): string {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 10)
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]+/g, '-')
}

function normalizeImportPath(filePath: string): string {
  const normalized = toPosixPath(filePath)
  return normalized.startsWith('.') ? normalized : `./${normalized}`
}

function manifestPath(projectRoot: string): string {
  return path.join(projectRoot, MANIFEST_RELATIVE_PATH)
}

function errorPrefix(projectRoot: string, filePath: string): string {
  return `Voltra dynamic live activities manifest at ${toPosixPath(path.relative(projectRoot, filePath))}`
}

export class MissingVoltraLiveActivitiesManifestError extends Error {
  constructor({ projectRoot, filePath }: { projectRoot: string; filePath: string }) {
    super(
      `Missing Voltra dynamic live activities manifest at ${toPosixPath(
        path.relative(projectRoot, filePath)
      )}. Run Expo prebuild for ios to generate it.`
    )
    this.name = 'MissingVoltraLiveActivitiesManifestError'
  }
}

export class InvalidVoltraLiveActivitiesManifestError extends Error {
  constructor({ projectRoot, filePath, reason }: { projectRoot: string; filePath: string; reason: string }) {
    super(`${errorPrefix(projectRoot, filePath)} is invalid: ${reason}`)
    this.name = 'InvalidVoltraLiveActivitiesManifestError'
  }
}

export class DuplicateVoltraLiveActivityError extends Error {
  constructor({
    projectRoot,
    filePath,
    definitionId,
  }: {
    projectRoot: string
    filePath: string
    definitionId: string
  }) {
    super(
      `${errorPrefix(
        projectRoot,
        filePath
      )} contains duplicate live activity id "${definitionId}". Live Activity ids must be unique within the Dynamic Live Activity manifest.`
    )
    this.name = 'DuplicateVoltraLiveActivityError'
  }
}

function validateManifest(projectRoot: string, filePath: string, raw: unknown): DynamicLiveActivityManifest {
  const invalid = (reason: string): never => {
    throw new InvalidVoltraLiveActivitiesManifestError({ projectRoot, filePath, reason })
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) invalid('manifest root must be a JSON object')
  const manifest = raw as Record<string, unknown>
  if (manifest.version !== 1) invalid(`expected version 1, received ${JSON.stringify(manifest.version)}`)
  if (manifest.platform !== 'ios') invalid(`expected platform "ios", received ${JSON.stringify(manifest.platform)}`)
  if (!Array.isArray(manifest.liveActivities)) invalid('liveActivities must be an array')

  const liveActivities: DynamicLiveActivityManifestDefinition[] = []
  const ids = new Set<string>()
  for (const [index, value] of (manifest.liveActivities as unknown[]).entries()) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      invalid(`liveActivities[${index}] must be an object with id and entry`)
    const definition = value as Record<string, unknown>
    if (typeof definition.id !== 'string' || !definition.id.trim())
      invalid(`liveActivities[${index}].id must be a non-empty string`)
    const id = definition.id as string
    if (!/^[A-Za-z0-9_]+$/.test(id))
      invalid(`liveActivities[${index}].id must contain only alphanumeric characters and underscores`)
    if (ids.has(id)) throw new DuplicateVoltraLiveActivityError({ projectRoot, filePath, definitionId: id })
    ids.add(id)
    let entry = ''
    try {
      entry = validateWidgetEntry(definition.entry, id, projectRoot)
    } catch (error) {
      invalid(error instanceof Error ? error.message : String(error))
    }
    liveActivities.push({ id, entry })
  }
  return { version: 1, platform: 'ios', liveActivities }
}

function createGeneratedEntry(projectRoot: string, generatedRoot: string, definition: RegisteredVoltraLiveActivity) {
  const entryRoot = path.join(generatedRoot, 'live-activities')
  const entryPath = path.join(entryRoot, `ios-${safeFileName(definition.id)}-${hash(definition.entry)}.js`)
  const entryImportPath = normalizeImportPath(path.relative(entryRoot, path.join(projectRoot, definition.entry)))
  const content = [
    `import { renderLiveActivityToJson } from '@use-voltra/ios'`,
    `import LiveActivity from ${JSON.stringify(entryImportPath)}`,
    '',
    'if (typeof LiveActivity !== "function") {',
    `  throw new Error(${JSON.stringify(
      `Voltra Dynamic Live Activity "${definition.id}" at "${definition.entry}" is missing a default function export.`
    )})`,
    '}',
    '',
    'function parseJSONInput(input, label) {',
    '  if (typeof input !== "string") return input || {}',
    '  if (!input) return {}',
    '  try { return JSON.parse(input) } catch (error) {',
    `    throw new Error(\`Voltra Dynamic Live Activity "${definition.id}" failed to parse \${label}: \${error instanceof Error ? error.message : String(error)}\`)`,
    '  }',
    '}',
    '',
    'export function render(propsJSON, environmentJSON) {',
    '  const props = parseJSONInput(propsJSON, "propsJSON")',
    '  const environment = parseJSONInput(environmentJSON, "environmentJSON")',
    '  if (environment.date != null) environment.date = new Date(environment.date)',
    '  return JSON.stringify(renderLiveActivityToJson(LiveActivity(props, environment)))',
    '}',
    '',
    'globalThis.__voltraDynamicLiveActivities = globalThis.__voltraDynamicLiveActivities || {}',
    `globalThis.__voltraDynamicLiveActivities[${JSON.stringify(definition.id)}] = { render }`,
    '',
    'export default render',
    '',
  ].join('\n')
  writeFileIfChanged(entryPath, content)
  return {
    generatedEntryPath: entryPath,
    generatedEntryRelativePath: toPosixPath(path.relative(projectRoot, entryPath)),
  }
}

function createBarrel(generatedRoot: string, definitions: RegisteredVoltraLiveActivity[]) {
  const barrelPath = path.join(generatedRoot, 'live-activity-hot-reload.ios.js')
  const imports = definitions.map(
    (definition) =>
      `import ${JSON.stringify(normalizeImportPath(path.relative(generatedRoot, definition.generatedEntryPath)))}`
  )
  writeFileIfChanged(
    barrelPath,
    [
      '// AUTO-GENERATED - do not edit. Side-effect imports that place manifest-declared Voltra Dynamic Live Activities in',
      '// the host app dependency graph so Metro Fast Refresh drives dev hot reload of definitions.',
      ...imports,
      '',
    ].join('\n')
  )
}

export function createLiveActivityRegistry({
  projectRoot = process.cwd(),
}: { projectRoot?: string } = {}): LiveActivityRegistry {
  const filePath = manifestPath(projectRoot)
  const generatedRoot = path.join(projectRoot, '.voltra', 'metro')
  let error: Error | null = null
  let definitions: RegisteredVoltraLiveActivity[] = []
  if (!fs.existsSync(filePath)) {
    error = new MissingVoltraLiveActivitiesManifestError({ projectRoot, filePath })
  } else {
    try {
      const manifest = validateManifest(projectRoot, filePath, JSON.parse(fs.readFileSync(filePath, 'utf8')))
      definitions = manifest.liveActivities.map((definition) => {
        const base: RegisteredVoltraLiveActivity = {
          ...definition,
          platform: 'ios',
          manifestPath: filePath,
          generatedEntryPath: '',
          generatedEntryRelativePath: '',
        }
        return { ...base, ...createGeneratedEntry(projectRoot, generatedRoot, base) }
      })
    } catch (caught) {
      error = caught instanceof Error ? caught : new Error(String(caught))
    }
  }
  createBarrel(generatedRoot, definitions)
  return {
    projectRoot,
    getLiveActivity(definitionId) {
      if (error) throw error
      return definitions.find((definition) => definition.id === definitionId) || null
    },
    isReady() {
      return true
    },
    listLiveActivities() {
      if (error) throw error
      return [...definitions]
    },
    close() {},
  }
}
