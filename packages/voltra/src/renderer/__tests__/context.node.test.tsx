import React, { createContext, useContext } from 'react'

import { Text } from '../../jsx/Text'
import { renderVoltraVariantToJson } from '../renderer'

describe('Context System', () => {
  test('1. Context provider with matching consumer', () => {
    // Render a ThemeContext.Provider with value="dark" wrapping a component that calls useContext(ThemeContext).
    // Verify the consumer component receives "dark" and the rendered output contains this value.
    const ThemeContext = createContext('light')

    const Consumer = () => {
      const theme = useContext(ThemeContext)
      return <Text>{theme}</Text>
    }

    const output = renderVoltraVariantToJson(
      <ThemeContext.Provider value="dark">
        <Consumer />
      </ThemeContext.Provider>
    )

    expect(output).toEqual({
      t: 0,
      c: 'dark',
    })
  })

  test('2. Context provider without consumer', () => {
    // Render a ThemeContext.Provider wrapping a <Text> that doesn't use the context.
    // Verify rendering completes without error and the Text content is preserved.
    const ThemeContext = createContext('light')

    const output = renderVoltraVariantToJson(
      <ThemeContext.Provider value="dark">
        <Text>Hello</Text>
      </ThemeContext.Provider>
    )

    expect(output).toEqual({
      t: 0,
      c: 'Hello',
    })
  })

  test('3. Nested context providers (same context)', () => {
    // Render outer provider with value="dark", inner provider with value="system", and a consumer inside.
    // Verify consumer receives "system" (inner overrides outer).
    const ThemeContext = createContext('light')

    const Consumer = () => {
      const theme = useContext(ThemeContext)
      return <Text>{theme}</Text>
    }

    const output = renderVoltraVariantToJson(
      <ThemeContext.Provider value="dark">
        <ThemeContext.Provider value="system">
          <Consumer />
        </ThemeContext.Provider>
      </ThemeContext.Provider>
    )

    expect(output).toEqual({
      t: 0,
      c: 'system',
    })
  })

  test('4. Context consumer without provider', () => {
    // Render a component using useContext(ThemeContext) without any provider ancestor.
    // Verify it returns the context's default value (e.g., "light").
    const ThemeContext = createContext('light')

    const Consumer = () => {
      const theme = useContext(ThemeContext)
      return <Text>{theme}</Text>
    }

    const output = renderVoltraVariantToJson(<Consumer />)

    expect(output).toEqual({
      t: 0,
      c: 'light',
    })
  })

  test('5. Multiple different contexts', () => {
    // Create two contexts (ThemeContext, UserContext).
    // Render both providers with different values and two consumers.
    // Verify each consumer receives its respective context value.
    const ThemeContext = createContext('light')
    const UserContext = createContext('guest')

    const Consumer = () => {
      const theme = useContext(ThemeContext)
      const user = useContext(UserContext)
      return <Text>{`${theme}-${user}`}</Text>
    }

    const output = renderVoltraVariantToJson(
      <ThemeContext.Provider value="dark">
        <UserContext.Provider value="admin">
          <Consumer />
        </UserContext.Provider>
      </ThemeContext.Provider>
    )

    expect(output).toEqual({
      t: 0,
      c: 'dark-admin',
    })
  })

  test('6. Context with undefined value', () => {
    // Render <ThemeContext.Provider value={undefined}>.
    // Verify consumer receives undefined, not the context's default value.
    // Note: In React, passing undefined as value CAUSES the consumer to use the value passed, which is undefined.
    // It does NOT fallback to default value (that happens only if provider is missing).
    const ThemeContext = createContext<string | undefined>('light')

    const Consumer = () => {
      const theme = useContext(ThemeContext)
      return <Text>{String(theme)}</Text>
    }

    const output = renderVoltraVariantToJson(
      <ThemeContext.Provider value={undefined}>
        <Consumer />
      </ThemeContext.Provider>
    )

    expect(output).toEqual({
      t: 0,
      c: 'undefined',
    })
  })

  test('7. Context with function value', () => {
    // Render provider with value={() => 'callback'}.
    // Verify the function is passed through to consumer without being invoked.
    const FunctionContext = createContext<() => string>(() => 'default')
    const callback = () => 'callback'

    const Consumer = () => {
      const fn = useContext(FunctionContext)
      // We render the result of calling the function to verify we got the right one
      return <Text>{fn()}</Text>
    }

    const output = renderVoltraVariantToJson(
      <FunctionContext.Provider value={callback}>
        <Consumer />
      </FunctionContext.Provider>
    )

    expect(output).toEqual({
      t: 0,
      c: 'callback',
    })
  })
})
