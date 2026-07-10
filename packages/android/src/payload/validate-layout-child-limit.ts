import { isAndroidDevelopmentEnvironment } from '../dev-environment.js'
import { getAndroidComponentId } from './component-ids.js'

const MAX_LAYOUT_CHILDREN = 10
const LAYOUT_COMPONENT_NAMES = new Map([
  [getAndroidComponentId('AndroidColumn'), 'AndroidColumn'],
  [getAndroidComponentId('AndroidRow'), 'AndroidRow'],
])

type SerializedNode = string | SerializedElement | SerializedNodeReference | SerializedNode[]

type SerializedElement = {
  t: number
  c?: SerializedNode
  p?: Record<string, unknown>
}

type SerializedNodeReference = {
  $r: number
}

type AndroidPayload = {
  variants?: Record<string, SerializedNode>
  collapsed?: SerializedNode
  expanded?: SerializedNode
  e?: SerializedNode[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isElement = (value: unknown): value is SerializedElement => isRecord(value) && typeof value.t === 'number'

const isReference = (value: unknown): value is SerializedNodeReference =>
  isRecord(value) && typeof value.$r === 'number'

const countDirectRenderedChildren = (node: SerializedNode | undefined, sharedElements: SerializedNode[]): number => {
  if (node === undefined) {
    return 0
  }

  const resolvingReferences = new Set<number>()

  const count = (current: SerializedNode): number => {
    if (Array.isArray(current)) {
      return current.reduce((total, child) => total + count(child), 0)
    }

    if (isReference(current)) {
      if (resolvingReferences.has(current.$r)) {
        return 0
      }

      const resolved = sharedElements[current.$r]
      if (resolved === undefined) {
        return 0
      }

      resolvingReferences.add(current.$r)
      const result = count(resolved)
      resolvingReferences.delete(current.$r)
      return result
    }

    return 1
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

  const traverseNode = (node: SerializedNode | undefined): void => {
    if (node === undefined || typeof node === 'string') {
      return
    }

    if (Array.isArray(node)) {
      if (visitedNodes.has(node)) {
        return
      }
      visitedNodes.add(node)
      node.forEach(traverseNode)
      return
    }

    if (visitedNodes.has(node)) {
      return
    }
    visitedNodes.add(node)

    if (isReference(node)) {
      traverseNode(sharedElements[node.$r])
      return
    }

    if (!isElement(node)) {
      return
    }

    const componentName = LAYOUT_COMPONENT_NAMES.get(node.t)
    if (componentName) {
      const childCount = countDirectRenderedChildren(node.c, sharedElements)
      if (childCount > MAX_LAYOUT_CHILDREN) {
        console.warn(
          `[Voltra] [Android] ${componentName} has ${childCount} direct children, exceeding Glance's ${MAX_LAYOUT_CHILDREN}-child limit. ` +
            'Extra children are truncated by Glance; use LazyColumn for dynamic or scrollable collections.'
        )
      }
    }

    traverseNode(node.c)
    if (node.p) {
      Object.values(node.p).forEach((value) => {
        if (Array.isArray(value) || isElement(value) || isReference(value)) {
          traverseNode(value as SerializedNode)
        }
      })
    }
  }

  if (payload.variants) {
    Object.values(payload.variants).forEach(traverseNode)
  }
  traverseNode(payload.collapsed)
  traverseNode(payload.expanded)
  sharedElements.forEach(traverseNode)
}
