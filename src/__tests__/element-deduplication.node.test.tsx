import React from 'react'

import { renderVoltraToJson } from '../renderer/renderer'
import { Voltra } from '../server'

describe('Element Deduplication', () => {
  it('should deduplicate the same element used multiple times', () => {
    // Create a single element that we'll reuse
    const sharedText = <Voltra.Text>Shared content</Voltra.Text>

    const result = renderVoltraToJson({
      lockScreen: (
        <Voltra.VStack>
          {sharedText}
          {sharedText}
          {sharedText}
        </Voltra.VStack>
      ),
    })

    // Should have shared elements array with 1 element
    expect(result.e).toBeDefined()
    expect(result.e).toHaveLength(1)
    expect(result.e![0]).toEqual({ t: 0, c: 'Shared content' })

    // The children should be references
    expect(result.ls).toEqual({
      t: 11, // VStack
      c: [{ $r: 0 }, { $r: 0 }, { $r: 0 }],
    })
  })

  it('should not deduplicate elements that appear only once', () => {
    const result = renderVoltraToJson({
      lockScreen: (
        <Voltra.VStack>
          <Voltra.Text>First</Voltra.Text>
          <Voltra.Text>Second</Voltra.Text>
        </Voltra.VStack>
      ),
    })

    // Should NOT have shared elements array (elements are unique)
    expect(result.e).toBeUndefined()

    // Children should be inline
    expect(result.ls).toEqual({
      t: 11, // VStack
      c: [
        { t: 0, c: 'First' },
        { t: 0, c: 'Second' },
      ],
    })
  })

  it('should deduplicate elements across different variants', () => {
    const sharedText = <Voltra.Text>Shared across variants</Voltra.Text>

    const result = renderVoltraToJson({
      lockScreen: sharedText,
      island: {
        minimal: sharedText,
      },
    })

    // Should have shared elements array with 1 element
    expect(result.e).toBeDefined()
    expect(result.e).toHaveLength(1)
    expect(result.e![0]).toEqual({ t: 0, c: 'Shared across variants' })

    // Both variants should reference the same shared element
    expect(result.ls).toEqual({ $r: 0 })
    expect(result.isl_min).toEqual({ $r: 0 })
  })

  it('should deduplicate nested shared elements', () => {
    const sharedChild = <Voltra.Text>Child</Voltra.Text>
    const sharedContainer = (
      <Voltra.VStack>
        {sharedChild}
        {sharedChild}
      </Voltra.VStack>
    )

    const result = renderVoltraToJson({
      lockScreen: (
        <Voltra.HStack>
          {sharedContainer}
          {sharedContainer}
        </Voltra.HStack>
      ),
    })

    // Should have shared elements for both the child and container
    expect(result.e).toBeDefined()
    expect(result.e!.length).toBeGreaterThanOrEqual(2)

    // The container's children should reference the shared child
    // And the root should reference the shared container
  })

  it('should handle deeply nested duplicate elements', () => {
    const leaf = <Voltra.Text>Leaf</Voltra.Text>

    const result = renderVoltraToJson({
      lockScreen: (
        <Voltra.VStack>
          <Voltra.HStack>
            {leaf}
            {leaf}
          </Voltra.HStack>
          <Voltra.HStack>{leaf}</Voltra.HStack>
        </Voltra.VStack>
      ),
    })

    // The leaf element should be deduplicated (appears 3 times)
    expect(result.e).toBeDefined()
    expect(result.e).toHaveLength(1)
    expect(result.e![0]).toEqual({ t: 0, c: 'Leaf' })
  })

  it('should work with complex components', () => {
    const sharedImage = <Voltra.Symbol name="star.fill" />

    const result = renderVoltraToJson({
      lockScreen: (
        <Voltra.HStack>
          {sharedImage}
          {sharedImage}
          {sharedImage}
          {sharedImage}
          {sharedImage}
        </Voltra.HStack>
      ),
    })

    // Should deduplicate the repeated Symbol
    expect(result.e).toBeDefined()
    expect(result.e).toHaveLength(1)
    expect(result.ls).toEqual({
      t: 12, // HStack
      c: [{ $r: 0 }, { $r: 0 }, { $r: 0 }, { $r: 0 }, { $r: 0 }],
    })
  })

  it('should reduce payload size with duplicates', () => {
    const sharedElement = (
      <Voltra.VStack>
        <Voltra.Text>Some longer text content here</Voltra.Text>
        <Voltra.Symbol name="checkmark.circle.fill" />
      </Voltra.VStack>
    )

    // Payload with deduplication
    const withDedup = renderVoltraToJson({
      lockScreen: (
        <Voltra.HStack>
          {sharedElement}
          {sharedElement}
          {sharedElement}
        </Voltra.HStack>
      ),
    })

    // Create equivalent payload without deduplication (different element instances)
    const withoutDedup = renderVoltraToJson({
      lockScreen: (
        <Voltra.HStack>
          <Voltra.VStack>
            <Voltra.Text>Some longer text content here</Voltra.Text>
            <Voltra.Symbol name="checkmark.circle.fill" />
          </Voltra.VStack>
          <Voltra.VStack>
            <Voltra.Text>Some longer text content here</Voltra.Text>
            <Voltra.Symbol name="checkmark.circle.fill" />
          </Voltra.VStack>
          <Voltra.VStack>
            <Voltra.Text>Some longer text content here</Voltra.Text>
            <Voltra.Symbol name="checkmark.circle.fill" />
          </Voltra.VStack>
        </Voltra.HStack>
      ),
    })

    const dedupSize = JSON.stringify(withDedup).length
    const noDedupSize = JSON.stringify(withoutDedup).length

    // Deduplicated payload should be smaller
    expect(dedupSize).toBeLessThan(noDedupSize)
  })

  it('should preserve payload version', () => {
    const result = renderVoltraToJson({
      lockScreen: <Voltra.Text>Hello</Voltra.Text>,
    })

    expect(result.v).toBe(1)
  })
})
