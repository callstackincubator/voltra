import { ReactNode } from 'react'

import { VoltraNodeJson } from '../types'

export type ElementRegistry = {
  /**
   * Check if an element has already been registered
   * @returns The index if registered, undefined otherwise
   */
  isRegistered: (element: ReactNode) => number | undefined
  /**
   * Register a rendered element and get its index
   */
  register: (element: ReactNode, rendered: VoltraNodeJson) => number
  /**
   * Get all registered shared elements
   */
  getElements: () => VoltraNodeJson[]
}

export const createElementRegistry = (): ElementRegistry => {
  const elementToIndex = new Map<ReactNode, number>()
  const elements: VoltraNodeJson[] = []

  return {
    isRegistered: (element: ReactNode): number | undefined => {
      return elementToIndex.get(element)
    },
    register: (element: ReactNode, rendered: VoltraNodeJson): number => {
      const index = elements.length
      elementToIndex.set(element, index)
      elements.push(rendered)
      return index
    },
    getElements: (): VoltraNodeJson[] => elements,
  }
}

/**
 * Pre-scan the element tree to identify elements that appear multiple times (by reference).
 * This is a fast O(n) traversal that only does reference comparisons.
 */
export const preScanForDuplicates = (element: ReactNode): Set<ReactNode> => {
  const seen = new Set<ReactNode>()
  const duplicates = new Set<ReactNode>()

  const scan = (node: ReactNode): void => {
    // Skip primitives and nullish values
    if (node === null || node === undefined || typeof node !== 'object') {
      return
    }

    // Handle arrays
    if (Array.isArray(node)) {
      for (const child of node) {
        scan(child)
      }
      return
    }

    // Reference equality check - very fast!
    if (seen.has(node)) {
      duplicates.add(node)
    } else {
      seen.add(node)
    }

    // Recurse into children if this is a React element
    if ('props' in node) {
      const props = (node as { props: Record<string, unknown> }).props
      if (props) {
        // Scan children
        if (props.children !== undefined) {
          scan(props.children as ReactNode)
        }

        // Also scan any props that might contain JSX elements
        for (const [key, value] of Object.entries(props)) {
          if (key !== 'children' && value && typeof value === 'object' && 'type' in value && 'props' in value) {
            scan(value as ReactNode)
          }
        }
      }
    }
  }

  scan(element)
  return duplicates
}
