import { parseStringPromise } from 'xml2js'

import { readTextFile, writeTextFile } from '../../fs/readWrite'
import { toRelativePath } from '../../fs/path'
import { VoltraCliError } from '../../reporting/summary'

import type { IOSProjectDiscovery } from '../../discovery/ios'
import type { NormalizedVoltraIOSConfig } from '../../config/types'
import type { ReportedChange } from '../../reporting/summary'

interface OrderedPlistNode {
  '#name'?: string
  _?: string
  $$?: OrderedPlistNode[]
}

interface TaggedPlistScalar {
  __voltraPlistScalarType: 'data' | 'date'
  value: string
}

type PlistErrorFactory = (message: string) => Error

export interface EnsureInfoPlistOptions {
  projectRoot: string
  ios: NormalizedVoltraIOSConfig
  discovery: IOSProjectDiscovery
}

export interface EnsureInfoPlistResult {
  change?: ReportedChange
}

export class IOSInfoPlistMutationError extends VoltraCliError {
  constructor(message: string) {
    super(message, 'VOLTRA_IOS_INFO_PLIST_FAILED')
    this.name = 'IOSInfoPlistMutationError'
  }
}

export async function ensureInfoPlist(options: EnsureInfoPlistOptions): Promise<EnsureInfoPlistResult> {
  const { projectRoot, ios, discovery } = options
  const infoPlist = await parsePlistFile(
    discovery.infoPlistPath,
    'main app Info.plist',
    createInfoPlistError
  )

  infoPlist.NSSupportsLiveActivities = true
  infoPlist.NSSupportsLiveActivitiesFrequentUpdates = false

  setOrDeleteVoltraKey(infoPlist, 'Voltra_AppGroupIdentifier', ios.groupIdentifier)
  setOrDeleteVoltraKey(infoPlist, 'Voltra_KeychainGroup', ios.keychainGroup)
  setOrDeleteVoltraKey(infoPlist, 'Voltra_EnablePushNotifications', ios.enablePushNotifications ? true : undefined)

  const widgetIds = ios.widgets.map((widget) => widget.id)
  setOrDeleteVoltraKey(infoPlist, 'Voltra_WidgetIds', widgetIds.length > 0 ? widgetIds : undefined)

  const serverWidgets = ios.widgets.filter((widget) => widget.serverUpdate)
  const serverUrls = Object.fromEntries(serverWidgets.map((widget) => [widget.id, widget.serverUpdate?.url]))
  const serverIntervals = Object.fromEntries(serverWidgets.map((widget) => [widget.id, widget.serverUpdate?.intervalMinutes]))

  setOrDeleteVoltraKey(infoPlist, 'Voltra_WidgetServerUrls', Object.keys(serverUrls).length > 0 ? serverUrls : undefined)
  setOrDeleteVoltraKey(
    infoPlist,
    'Voltra_WidgetServerIntervals',
    Object.keys(serverIntervals).length > 0 ? serverIntervals : undefined
  )

  const nextContent = buildPlistXml(infoPlist, createInfoPlistError)
  const change = await writePlistIfChanged(projectRoot, discovery.infoPlistPath, nextContent)

  return { change }
}

export async function parsePlistFile(
  filePath: string,
  errorContext: string,
  createError: PlistErrorFactory
): Promise<Record<string, unknown>> {
  let content: string

  try {
    content = await readTextFile(filePath)
  } catch (error: unknown) {
    throw createError(`Failed to read ${errorContext} at ${filePath}: ${getErrorMessage(error)}`)
  }

  let parsed: unknown

  try {
    parsed = await parseStringPromise(content, {
      explicitArray: false,
      explicitChildren: true,
      preserveChildrenOrder: true,
    })
  } catch (error: unknown) {
    throw createError(`Failed to parse ${errorContext} at ${filePath}: ${getErrorMessage(error)}`)
  }

  const plistRoot = getPlistRoot(parsed, errorContext, filePath, createError)
  return parsePlistDict(plistRoot, errorContext, filePath, createError)
}

export function buildPlistXml(value: unknown, createError: PlistErrorFactory): string {
  try {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
      '<plist version="1.0">',
      renderPlistValue(value, 0, createError),
      '</plist>',
      '',
    ].join('\n')
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw error
    }

    throw createError(`Failed to build plist XML: ${String(error)}`)
  }
}

function getPlistRoot(
  value: unknown,
  errorContext: string,
  filePath: string,
  createError: PlistErrorFactory
): OrderedPlistNode {
  if (!value || typeof value !== 'object' || !('plist' in value)) {
    throw createError(`Parsed ${errorContext} at ${filePath} is missing the plist root.`)
  }

  const plistValue = (value as { plist?: { dict?: unknown } }).plist

  if (!plistValue || typeof plistValue !== 'object' || !('dict' in plistValue)) {
    throw createError(`Parsed ${errorContext} at ${filePath} is missing the root dict.`)
  }

  if (!plistValue.dict || typeof plistValue.dict !== 'object') {
    throw createError(`Parsed ${errorContext} at ${filePath} contains an invalid root dict.`)
  }

  return plistValue.dict as OrderedPlistNode
}

function parsePlistDict(
  node: OrderedPlistNode,
  errorContext: string,
  filePath: string,
  createError: PlistErrorFactory
): Record<string, unknown> {
  const children = getOrderedChildren(node)
  const result: Record<string, unknown> = {}

  for (let index = 0; index < children.length; index += 2) {
    const keyNode = children[index]
    const valueNode = children[index + 1]

    if (keyNode?.['#name'] !== 'key' || typeof keyNode._ !== 'string' || keyNode._.trim().length === 0) {
      throw createError(`Parsed ${errorContext} at ${filePath} contains an invalid dict key.`)
    }

    if (!valueNode) {
      throw createError(`Parsed ${errorContext} at ${filePath} is missing a value for key '${keyNode._}'.`)
    }

    result[keyNode._] = parsePlistValue(valueNode, errorContext, filePath, createError)
  }

  return result
}

function parsePlistArray(
  node: OrderedPlistNode,
  errorContext: string,
  filePath: string,
  createError: PlistErrorFactory
): unknown[] {
  return getOrderedChildren(node).map((child) => parsePlistValue(child, errorContext, filePath, createError))
}

function parsePlistValue(
  node: OrderedPlistNode,
  errorContext: string,
  filePath: string,
  createError: PlistErrorFactory
): unknown {
  switch (node['#name']) {
    case 'string':
      return node._ ?? ''
    case 'integer':
    case 'real': {
      const rawValue = node._ ?? ''
      const numericValue = Number(rawValue)

      if (!Number.isFinite(numericValue)) {
        throw createError(`Parsed ${errorContext} at ${filePath} contains an invalid ${node['#name']} value '${rawValue}'.`)
      }

      return numericValue
    }
    case 'true':
      return true
    case 'false':
      return false
    case 'dict':
      return parsePlistDict(node, errorContext, filePath, createError)
    case 'array':
      return parsePlistArray(node, errorContext, filePath, createError)
    case 'data':
      return { __voltraPlistScalarType: 'data', value: node._ ?? '' } satisfies TaggedPlistScalar
    case 'date':
      return { __voltraPlistScalarType: 'date', value: node._ ?? '' } satisfies TaggedPlistScalar
    default:
      throw createError(
        `Parsed ${errorContext} at ${filePath} contains unsupported plist node '${node['#name'] ?? 'unknown'}'.`
      )
  }
}

function getOrderedChildren(node: OrderedPlistNode): OrderedPlistNode[] {
  return Array.isArray(node.$$) ? node.$$ : []
}

function renderPlistValue(value: unknown, indentLevel: number, createError: PlistErrorFactory): string {
  const indent = '  '.repeat(indentLevel)

  if (Array.isArray(value)) {
    const items = value.map((item) => renderPlistValue(item, indentLevel + 1, createError)).join('\n')
    return `${indent}<array>\n${items}\n${indent}</array>`
  }

  if (isTaggedPlistScalar(value)) {
    return `${indent}<${value.__voltraPlistScalarType}>${escapePlistText(value.value)}</${value.__voltraPlistScalarType}>`
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
    const lines = entries.flatMap(([key, entryValue]) => [
      `${indent}  <key>${escapePlistText(key)}</key>`,
      renderPlistValue(entryValue, indentLevel + 1, createError),
    ])
    return `${indent}<dict>\n${lines.join('\n')}\n${indent}</dict>`
  }

  if (typeof value === 'string') {
    return `${indent}<string>${escapePlistText(value)}</string>`
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? `${indent}<integer>${value}</integer>` : `${indent}<real>${value}</real>`
  }

  if (typeof value === 'boolean') {
    return `${indent}<${value ? 'true' : 'false'}/>`
  }

  if (value === null || value === undefined) {
    throw createError('Cannot encode null or undefined in plist output.')
  }

  throw createError(`Unsupported plist value type: ${typeof value}`)
}

function isTaggedPlistScalar(value: unknown): value is TaggedPlistScalar {
  return (
    !!value &&
    typeof value === 'object' &&
    '__voltraPlistScalarType' in value &&
    ((value as TaggedPlistScalar).__voltraPlistScalarType === 'data' ||
      (value as TaggedPlistScalar).__voltraPlistScalarType === 'date') &&
    typeof (value as TaggedPlistScalar).value === 'string'
  )
}

function setOrDeleteVoltraKey(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value === undefined) {
    delete target[key]
    return
  }

  target[key] = value
}

async function writePlistIfChanged(
  projectRoot: string,
  plistPath: string,
  nextContent: string
): Promise<ReportedChange | undefined> {
  const previousContent = await readTextFile(plistPath)

  if (previousContent === nextContent) {
    return undefined
  }

  await writeTextFile(plistPath, nextContent)

  return {
    kind: 'updated',
    path: toRelativePath(projectRoot, plistPath),
  }
}

function escapePlistText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function createInfoPlistError(message: string): IOSInfoPlistMutationError {
  return new IOSInfoPlistMutationError(message)
}
