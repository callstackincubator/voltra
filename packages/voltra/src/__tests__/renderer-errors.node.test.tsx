import React, { Component, StrictMode, Suspense } from 'react'

import { Voltra } from '@use-voltra/ios'
import { renderVoltraVariantToJson } from '../renderer/renderer'

const { Text, Button } = Voltra

describe('Errors', () => {
  test('1. Host component (div)', () => {
    expect(() => {
      renderVoltraVariantToJson(<div>content</div>)
    }).toThrow(/not supported/)
  })

  test('2. Host component (span)', () => {
    expect(() => {
      renderVoltraVariantToJson(<span>text</span>)
    }).toThrow(/not supported/)
  })

  test('3. Class component', () => {
    class MyClass extends Component {
      render() {
        return <Text>Hi</Text>
      }
    }
    expect(() => {
      renderVoltraVariantToJson(<MyClass />)
    }).toThrow(/Class components are not supported/)
  })

  test('4. Portal', () => {
    const portal = {
      $$typeof: Symbol.for('react.portal'),
      type: Symbol.for('react.portal'),
      key: null,
      children: <Text>x</Text>,
      props: {
        children: <Text>x</Text>,
        containerInfo: {},
        implementation: null,
      },
      containerInfo: {},
      implementation: null,
    }
    expect(() => {
      renderVoltraVariantToJson(portal as any)
    }).toThrow(/Portal is not supported/)
  })

  test('5. Suspense', () => {
    expect(() => {
      renderVoltraVariantToJson(
        <Suspense fallback={<Text>Loading</Text>}>
          <Text>x</Text>
        </Suspense>
      )
    }).toThrow(/Suspense is not supported/)
  })

  test('6. StrictMode', () => {
    expect(() => {
      renderVoltraVariantToJson(
        <StrictMode>
          <Text>x</Text>
        </StrictMode>
      )
    }).toThrow(/Strict mode is not supported/)
  })

  test('7. Non-Voltra component in Text', () => {
    expect(() => {
      renderVoltraVariantToJson(
        <Text>
          <Button>x</Button>
        </Text>
      )
    }).toThrow(/Expected a React element, but got "string"\. Strings are only allowed as children of Text components/)
  })

  test('8. Invalid element type', () => {
    const invalidElement = React.createElement(123 as any, {}, 'content')
    expect(() => {
      renderVoltraVariantToJson(invalidElement)
    }).toThrow(/Unsupported element type/)
  })

  test('9. Circular component reference', () => {
    const A = () => <B />
    const B = () => <A />

    try {
      renderVoltraVariantToJson(<A />)
    } catch (e: any) {
      expect(e).toBeDefined()
    }
  })

  test('10. Component throws error', () => {
    const Faulty = () => {
      throw new Error('oops')
    }
    expect(() => {
      renderVoltraVariantToJson(<Faulty />)
    }).toThrow('oops')
  })
})
