import React, { createContext, useContext } from 'react'

import { Voltra } from '@use-voltra/ios'
import { renderVoltraVariantToJson } from '../renderer/renderer'

const { Text } = Voltra

describe('Context System', () => {
  test('1. Context provider with matching consumer', () => {
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
    const FunctionContext = createContext<() => string>(() => 'default')
    const callback = () => 'callback'

    const Consumer = () => {
      const fn = useContext(FunctionContext)
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
