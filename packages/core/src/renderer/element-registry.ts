import { ReactNode } from 'react'

import { VoltraNodeJson } from '../types.js'

export type ElementRegistry = {
  isRegistered: (element: ReactNode) => number | undefined
  register: (element: ReactNode, rendered: VoltraNodeJson) => number
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

export const preScanForDuplicates = (element: ReactNode): Set<ReactNode> => {
  const seen = new Set<ReactNode>()
  const duplicates = new Set<ReactNode>()

  const scan = (node: ReactNode): void => {
    if (node === null || node === undefined || typeof node !== 'object') {
      return
    }

    if (Array.isArray(node)) {
      for (const child of node) {
        scan(child)
      }
      return
    }

    if (seen.has(node)) {
      duplicates.add(node)
    } else {
      seen.add(node)
    }

    if ('props' in node) {
      const props = (node as { props: Record<string, unknown> }).props
      if (props) {
        if (props.children !== undefined) {
          scan(props.children as ReactNode)
        }

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
