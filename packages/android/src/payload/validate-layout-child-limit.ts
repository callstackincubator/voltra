import type { VoltraElementJson, VoltraNodeJson } from '@use-voltra/core'

import { isAndroidDevelopmentEnvironment } from '../dev-environment.js'
import { getAndroidComponentId } from './component-ids.js'

const MAX_LAYOUT_CHILDREN = 10
const LAYOUT_COMPONENT_NAMES = new Map([
  [getAndroidComponentId('AndroidColumn'), 'AndroidColumn'],
  [getAndroidComponentId('AndroidRow'), 'AndroidRow'],
])

type AndroidPayload = {
  variants?: Record<string, VoltraNodeJson>
  collapsed?: VoltraNodeJson
  expanded?: VoltraNodeJson
  e?: VoltraNodeJson[]
}

const getReference = (value: unknown): number | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || !('$r' in value)) {
    return undefined
  }

  const reference = (value as { $r?: unknown }).$r
  return typeof reference === 'number' ? reference : undefined
}

const countDirectRenderedChildren = (node: VoltraNodeJson | undefined, sharedElements: VoltraNodeJson[]): number => {
  const resolvingReferences = new Set<number>()

  const count = (current: VoltraNodeJson | undefined): number => {
    if (current === undefined) {
      return 0
    }

    if (Array.isArray(current)) {
      return current.reduce((total, child) => total + count(child), 0)
    }

    const reference = getReference(current)
    if (reference === undefined) {
      return 1
    }

    if (resolvingReferences.has(reference)) {
      return 0
    }

    resolvingReferences.add(reference)
    const result = count(sharedElements[reference])
    resolvingReferences.delete(reference)
    return result
  }

  return count(node)
}

/** Warns when a serialized Glance Row or Column exceeds its native child limit. */
export const validateAndroidLayoutChildLimit = (payload: AndroidPayload): void => {
  if (!isAndroidDevelopmentEnvironment()) {
    return
  }

  const sharedElements = payload.e ?? []
  const visitedNodes = new WeakSet<object>()

  const visit = (node: unknown): void => {
    if (typeof node !== 'object' || node === null) {
      return
    }

    if (visitedNodes.has(node)) {
      return
    }
    visitedNodes.add(node)

    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }

    const reference = getReference(node)
    if (reference !== undefined) {
      visit(sharedElements[reference])
      return
    }

    if (!('t' in node) || typeof node.t !== 'number') {
      return
    }

    const element = node as VoltraElementJson
    const componentName = LAYOUT_COMPONENT_NAMES.get(element.t)
    if (componentName) {
      const childCount = countDirectRenderedChildren(element.c, sharedElements)
      if (childCount > MAX_LAYOUT_CHILDREN) {
        console.warn(
          `[Voltra] [Android] ${componentName} has ${childCount} direct children, exceeding Glance's ${MAX_LAYOUT_CHILDREN}-child limit. ` +
            'Extra children are truncated by Glance; use LazyColumn for dynamic or scrollable collections.'
        )
      }
    }

    visit(element.c)
    Object.values(element.p ?? {}).forEach(visit)
  }

  Object.values(payload.variants ?? {}).forEach(visit)
  visit(payload.collapsed)
  visit(payload.expanded)
  sharedElements.forEach(visit)
}
