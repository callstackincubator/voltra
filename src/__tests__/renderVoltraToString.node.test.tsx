import React, { ElementType, Suspense } from 'react'

import { renderVoltraVariantToJson } from '../renderer/renderer'
import { Voltra } from '../server'

describe('renderVoltraVariantToJson', () => {
  it('should render a simple text component', () => {
    const element = <Voltra.Text>Hello, world!</Voltra.Text>
    const result = renderVoltraVariantToJson(element)
    expect(result).toEqual({ type: 'Text', props: {}, children: 'Hello, world!' })
  })

  it('should render nested components', () => {
    const element = (
      <Voltra.VStack>
        <Voltra.Text>Element 1</Voltra.Text>
        <Voltra.Text>Element 2</Voltra.Text>
      </Voltra.VStack>
    )
    const result = renderVoltraVariantToJson(element)
    expect(result).toEqual({
      type: 'VStack',
      props: {},
      children: [
        { type: 'Text', props: {}, children: 'Element 1' },
        { type: 'Text', props: {}, children: 'Element 2' },
      ],
    })
  })

  describe('Text', () => {
    it('should render a simple text component', () => {
      const element = <Voltra.Text>Hello, world!</Voltra.Text>
      const result = renderVoltraVariantToJson(element)
      expect(result).toEqual({ type: 'Text', props: {}, children: 'Hello, world!' })
    })

    it('should not allow nested components', () => {
      const element = (
        <Voltra.Text>
          <Voltra.Text>Hello, world!</Voltra.Text>
        </Voltra.Text>
      )
      expect(() => renderVoltraVariantToJson(element)).toThrow('Text component children must resolve to a string.')
    })
  })

  it('should throw error for component triggering suspense', () => {
    const SuspenseComponent = () => {
      throw new Promise(() => {}) // Simulate suspense
    }

    const element = <SuspenseComponent />
    expect(() => renderVoltraVariantToJson(element)).toThrow(
      'Component "SuspenseComponent" suspended! Voltra does not support Suspense/Promises.'
    )
  })

  it('should throw error for async component returning promise', () => {
    const AsyncComponent = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      return 'Async result'
    }

    const element = <AsyncComponent />
    expect(() => renderVoltraVariantToJson(element)).toThrow(
      'Component "AsyncComponent" tried to suspend (returned a Promise). Async components are not supported in this synchronous renderer.'
    )
  })

  it('should throw error for class component', () => {
    class ClassComponent extends React.Component {
      render() {
        return 'Hello'
      }
    }

    const element = <ClassComponent />
    expect(() => renderVoltraVariantToJson(element)).toThrow('Class components are not supported in Voltra.')
  })

  it('should handle context providers correctly', () => {
    const TestContext = React.createContext('default')

    const element = (
      <TestContext.Provider value="provided">
        <TestContext.Consumer>{(value) => <Voltra.Text>{value}</Voltra.Text>}</TestContext.Consumer>
      </TestContext.Provider>
    )

    const result = renderVoltraVariantToJson(element)
    expect(result).toEqual({ type: 'Text', props: {}, children: 'provided' })
  })

  it('should handle context consumers correctly', () => {
    const TestContext = React.createContext('default')

    const element = (
      <TestContext.Provider value="from provider">
        <TestContext.Consumer>{(value) => <Voltra.Text>Consumed: {value}</Voltra.Text>}</TestContext.Consumer>
      </TestContext.Provider>
    )

    const result = renderVoltraVariantToJson(element)
    expect(result).toEqual({ type: 'Text', props: {}, children: 'Consumed: from provider' })
  })

  it('should handle context consumers with default values', () => {
    const TestContext = React.createContext('default value')

    const element = <TestContext.Consumer>{(value) => <Voltra.Text>{value}</Voltra.Text>}</TestContext.Consumer>

    const result = renderVoltraVariantToJson(element)
    expect(result).toEqual({ type: 'Text', props: {}, children: 'default value' })
  })

  it('should throw error for Suspense component', () => {
    const element = <Suspense>In suspense</Suspense>
    expect(() => renderVoltraVariantToJson(element)).toThrow('Suspense is not supported in Voltra.')
  })

  it('should throw error for Portal component', () => {
    // Portal is not exported from React, but still exists as a symbol
    const Portal = Symbol.for('react.portal') as unknown as ElementType
    const element = <Portal>Portal content</Portal>

    expect(() => renderVoltraVariantToJson(element)).toThrow('Portal is not supported in Voltra.')
  })

  it('should throw error for Profiler component', () => {
    const element = React.createElement(
      React.Profiler,
      {
        id: 'test',
        onRender: () => {},
      },
      <Voltra.Text>Profiled content</Voltra.Text>
    )

    expect(() => renderVoltraVariantToJson(element)).toThrow('Profiler is not supported in Voltra.')
  })

  it('should flatten nested fragments', () => {
    const element = (
      <>
        <Voltra.Text>Element 1</Voltra.Text>
        <>
          <Voltra.Text>Element 2</Voltra.Text>
          <Voltra.Text>Element 3</Voltra.Text>
        </>
      </>
    )
    const result = renderVoltraVariantToJson(element)

    expect(result).toEqual([
      { type: 'Text', props: {}, children: 'Element 1' },
      { type: 'Text', props: {}, children: 'Element 2' },
      { type: 'Text', props: {}, children: 'Element 3' },
    ])
  })
})
