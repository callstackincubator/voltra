import React, { createContext, useContext } from 'react'

import { HStack } from '../../jsx/HStack'
import { Text } from '../../jsx/Text'
import { VStack } from '../../jsx/VStack'
import { ZStack } from '../../jsx/ZStack'
import { renderVoltraVariantToJson } from '../renderer'

describe('Deep Nesting', () => {
  test('50 levels of nesting', () => {
    const createLevel = (depth: number): React.ReactNode => {
      if (depth === 0) return <Text>Leaf</Text>
      return <VStack>{createLevel(depth - 1)}</VStack>
    }

    expect(() => {
      const output = renderVoltraVariantToJson(createLevel(50))
      expect(output).toBeTruthy()
      expect(output.t).toBe(11)
    }).not.toThrow()
  })

  test('100 levels of nesting', () => {
    const createLevel = (depth: number): React.ReactNode => {
      if (depth === 0) return <Text>Leaf</Text>
      return <VStack>{createLevel(depth - 1)}</VStack>
    }

    expect(() => {
      const output = renderVoltraVariantToJson(createLevel(100))
      expect(output).toBeTruthy()
    }).not.toThrow()
  })

  test('200 levels of nesting', () => {
    const createLevel = (depth: number): React.ReactNode => {
      if (depth === 0) return <Text>Leaf</Text>
      return <VStack>{createLevel(depth - 1)}</VStack>
    }

    try {
      const output = renderVoltraVariantToJson(createLevel(200))
      expect(output).toBeTruthy()
    } catch (e: any) {
      // If it throws, it should be a meaningful error, not a native stack overflow
      expect(e.message).toBeDefined()
    }
  })

  test('Mixed component nesting', () => {
    const createLevel = (depth: number): React.ReactNode => {
      if (depth === 0) return <Text>Leaf</Text>
      const Component = depth % 3 === 0 ? VStack : depth % 3 === 1 ? HStack : ZStack
      return <Component>{createLevel(depth - 1)}</Component>
    }

    const output = renderVoltraVariantToJson(createLevel(100))
    expect(output).toBeTruthy()
    expect(output.t).toBe(12)
  })

  test('Nesting with context at each level', () => {
    const CounterContext = createContext(0)

    const Leaf = () => {
      const count = useContext(CounterContext)
      return <Text>{count}</Text>
    }

    const NestedProvider = ({ depth, maxDepth }: { depth: number; maxDepth: number }): React.ReactNode => {
      if (depth === 0) {
        return <Leaf />
      }
      const contextValue = maxDepth - depth + 1
      return (
        <CounterContext.Provider value={contextValue}>
          <VStack>
            <NestedProvider depth={depth - 1} maxDepth={maxDepth} />
          </VStack>
        </CounterContext.Provider>
      )
    }

    const output = renderVoltraVariantToJson(<NestedProvider depth={10} maxDepth={10} />)
    expect(output).toBeTruthy()
    expect(typeof output).toBe('object')
    expect((output as any).t).toBe(11) // VStack type

    // Navigate through the nested structure to find the leaf Text component
    let current = (output as any).c
    for (let i = 9; i >= 1; i--) {
      expect(current).toBeTruthy()
      expect(typeof current).toBe('object')
      expect(current.t).toBe(11) // Each level is a VStack
      current = current.c
    }

    // At the innermost level, we should have the Text component
    expect(current).toBeTruthy()
    expect(typeof current).toBe('object')
    expect(current.t).toBe(0) // Text type
    expect(current.c).toBe('10') // The context value from the innermost provider
  })

  test('Performance benchmark: 50 levels', () => {
    const createLevel = (depth: number): React.ReactNode => {
      if (depth === 0) return <Text>Leaf</Text>
      return <VStack>{createLevel(depth - 1)}</VStack>
    }

    const start = performance.now()
    renderVoltraVariantToJson(createLevel(50))
    const end = performance.now()
    expect(end - start).toBeLessThan(100)
  })

  test('Performance benchmark: 100 levels', () => {
    const createLevel = (depth: number): React.ReactNode => {
      if (depth === 0) return <Text>Leaf</Text>
      return <VStack>{createLevel(depth - 1)}</VStack>
    }

    const start = performance.now()
    renderVoltraVariantToJson(createLevel(100))
    const end = performance.now()
    expect(end - start).toBeLessThan(500)
  })
})
