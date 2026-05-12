import React, {
  createContext,
  Usable,
  use,
  useActionState,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useOptimistic,
  useReducer,
  useRef,
  useState,
} from 'react'

import { Voltra } from '@use-voltra/ios'
import { renderVoltraVariantToJson } from '../renderer/renderer'

const { Text } = Voltra

const maybeUseEffectEvent = useEffectEvent as ((callback: typeof jest.fn) => typeof jest.fn) | undefined

describe('Hooks', () => {
  test('1. useState with primitive', () => {
    let stateVal, setState
    const Component = () => {
      ;[stateVal, setState] = useState(42)
      return <Text>{stateVal}</Text>
    }
    const output = renderVoltraVariantToJson(<Component />)
    expect(output.c).toBe('42')
    expect(stateVal).toBe(42)
    expect(typeof setState).toBe('function')
  })

  test('2. useState with object', () => {
    const initialObj = { count: 0 }
    let stateVal
    const Component = () => {
      ;[stateVal] = useState(initialObj)
      return <Text>test</Text>
    }
    renderVoltraVariantToJson(<Component />)
    expect(stateVal).toBe(initialObj)
  })

  test('3. useState with initializer function', () => {
    const initFn = jest.fn(() => 'computed')
    let stateVal
    const Component = () => {
      ;[stateVal] = useState(initFn)
      return <Text>{stateVal}</Text>
    }
    const output = renderVoltraVariantToJson(<Component />)
    expect(output.c).toBe('computed')
    expect(initFn).toHaveBeenCalledTimes(1)
  })

  test('4. useState with function value (not initializer)', () => {
    const myFn = jest.fn()
    const Component = () => {
      useState(myFn)
      return <Text>test</Text>
    }
    renderVoltraVariantToJson(<Component />)
    expect(myFn).toHaveBeenCalled()
  })

  test('5. useReducer basic', () => {
    const reducer = (state: { count: number }, _action: unknown) => state
    const initial = { count: 0 }
    let stateVal, dispatch
    const Component = () => {
      ;[stateVal, dispatch] = useReducer(reducer, initial)
      return <Text>test</Text>
    }
    renderVoltraVariantToJson(<Component />)
    expect(stateVal).toBe(initial)
    expect(typeof dispatch).toBe('function')
  })

  test('6. useReducer with init', () => {
    const reducer = (state: { count: number }, _action: unknown) => state
    const initFn = (n: number) => ({ count: n * 2 })
    let stateVal
    const Component = () => {
      ;[stateVal] = useReducer(reducer, 5, initFn)
      return <Text>test</Text>
    }
    renderVoltraVariantToJson(<Component />)
    expect(stateVal).toEqual({ count: 10 })
  })

  test('7. useMemo executes factory', () => {
    const factory = jest.fn(() => 'expensive')
    let memoized
    const Component = () => {
      memoized = useMemo(factory, [])
      return <Text>{memoized}</Text>
    }
    const output = renderVoltraVariantToJson(<Component />)
    expect(output.c).toBe('expensive')
    expect(factory).toHaveBeenCalledTimes(1)
  })

  test('8. useMemo with deps', () => {
    const Component = () => {
      const dep1 = 'dep1'
      const dep2 = 'dep2'
      useMemo(() => `${dep1}:${dep2}`, [dep1, dep2])
      return <Text>test</Text>
    }
    expect(() => renderVoltraVariantToJson(<Component />)).not.toThrow()
  })

  test('9. useCallback returns identity', () => {
    const fn = () => {}
    let cb
    const Component = () => {
      cb = useCallback(fn, [])
      return <Text>test</Text>
    }
    renderVoltraVariantToJson(<Component />)
    expect(cb).toBe(fn)
  })

  test('10. useRef with initial', () => {
    let ref
    const Component = () => {
      ref = useRef('initial')
      return <Text>test</Text>
    }
    renderVoltraVariantToJson(<Component />)
    expect(ref).toEqual({ current: 'initial' })
  })

  test('11. useRef mutation', () => {
    let refVal
    const Component = () => {
      const ref = useRef(0)
      ref.current = 5
      refVal = ref.current
      return <Text>test</Text>
    }
    renderVoltraVariantToJson(<Component />)
    expect(refVal).toBe(5)
  })

  test('12. useEffect is no-op', () => {
    const effect = jest.fn()
    const Component = () => {
      useEffect(effect, [])
      return <Text>test</Text>
    }
    renderVoltraVariantToJson(<Component />)
    expect(effect).not.toHaveBeenCalled()
  })

  test('13. useLayoutEffect is no-op', () => {
    const effect = jest.fn()
    const Component = () => {
      useLayoutEffect(effect, [])
      return <Text>test</Text>
    }
    renderVoltraVariantToJson(<Component />)
    expect(effect).not.toHaveBeenCalled()
  })

  test('14. useId returns stable ID', () => {
    let id1, id2
    const Component = () => {
      id1 = useId()
      id2 = useId()
      return <Text>test</Text>
    }
    renderVoltraVariantToJson(<Component />)
    expect(typeof id1).toBe('string')
    expect(id1).toBeTruthy()
    expect(typeof id2).toBe('string')
    expect(id2).toBeTruthy()
    expect(id1).not.toBe(id2)
  })

  test('15. Multiple hooks in sequence', () => {
    const Component = () => {
      const [val] = useState(1)
      const memo = useMemo(() => val * 2, [val])
      const cb = useCallback(() => memo, [memo])
      return <Text>{cb()}</Text>
    }
    const output = renderVoltraVariantToJson(<Component />)
    expect(output.c).toBe('2')
  })

  test('16. use(context) reads context value', () => {
    const ThemeContext = createContext('light')
    const Consumer = () => {
      const theme = use(ThemeContext)
      return <Text>{theme}</Text>
    }
    const output = renderVoltraVariantToJson(
      <ThemeContext.Provider value="dark">
        <Consumer />
      </ThemeContext.Provider>
    )
    expect(output.c).toBe('dark')
  })

  test('17. use(context) without provider returns default', () => {
    const ThemeContext = createContext('light')
    const Consumer = () => {
      const theme = use(ThemeContext)
      return <Text>{theme}</Text>
    }
    const output = renderVoltraVariantToJson(<Consumer />)
    expect(output.c).toBe('light')
  })

  test('18. use(promise) throws', () => {
    const Component = () => {
      use(Promise.resolve('value'))
      return <Text>test</Text>
    }
    expect(() => renderVoltraVariantToJson(<Component />)).toThrow('use() with promises is not supported in Voltra')
  })

  test('19. use(unsupportedValue) throws', () => {
    const Component = () => {
      use('not a context or promise' as unknown as Usable<unknown>)
      return <Text>test</Text>
    }
    expect(() => renderVoltraVariantToJson(<Component />)).toThrow('An unsupported type was passed to use()')
  })

  test('20. useActionState returns [initialState, dispatch, false]', () => {
    const action = jest.fn()
    let state, dispatch, isPending
    const Component = () => {
      ;[state, dispatch, isPending] = useActionState(action, { count: 0 })
      return <Text>{state.count}</Text>
    }
    const output = renderVoltraVariantToJson(<Component />)
    expect(output.c).toBe('0')
    expect(state).toEqual({ count: 0 })
    expect(typeof dispatch).toBe('function')
    expect(isPending).toBe(false)
    dispatch()
    expect(action).not.toHaveBeenCalled()
  })

  test('21. useOptimistic returns [passthrough, setter]', () => {
    let value, setOptimistic
    const Component = () => {
      ;[value, setOptimistic] = useOptimistic('real')
      return <Text>{value}</Text>
    }
    const output = renderVoltraVariantToJson(<Component />)
    expect(output.c).toBe('real')
    expect(value).toBe('real')
    expect(typeof setOptimistic).toBe('function')
    setOptimistic('optimistic')
    expect(value).toBe('real')
  })

  test('22. useEffectEvent returns callback identity', () => {
    if (typeof maybeUseEffectEvent !== 'function') {
      expect(useEffectEvent).toBeUndefined()
      return
    }

    const fn = jest.fn()
    let eventFn
    const Component = () => {
      eventFn = maybeUseEffectEvent(fn)
      return <Text>test</Text>
    }
    renderVoltraVariantToJson(<Component />)
    expect(eventFn).toBe(fn)
  })
})
