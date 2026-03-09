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

import { Text } from '../../jsx/Text'
import { renderVoltraVariantToJson } from '../renderer'

describe('Hooks', () => {
  test('1. useState with primitive', () => {
    // Call useState(42) in component. Verify returns [42, setter] where setter is a function (noop in static render).
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
    // Call useState({ count: 0 }). Verify returns the exact same object reference, not a copy.
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
    // Call useState(() => 'computed') with jest mock. Verify initializer is called exactly once and result 'computed' is returned.
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
    // Pass a named function function myFn() {} to useState. Verify it's treated as value (not called) if it has function characteristics.
    // React treats function passed to useState as initializer.
    // If I want to store a function, I must wrap it: useState(() => myFn).
    // The test case says "Pass a named function ... to useState. Verify it's treated as value (not called) if it has function characteristics. Document expected behavior."
    // Standard React behavior: useState(fn) calls fn and uses return value as state.
    // So if I pass `function myFn() {}`, it will be called.
    // Unless the test implies Voltra behaves differently?
    // Let's assume standard React behavior.
    // If I want to store a function, I do `useState(() => myFn)`.
    // The test case is slightly ambiguous. "Verify it's treated as value (not called) if it has function characteristics."
    // If it expects it NOT to be called, that contradicts React.
    // I will write the test to verify React behavior: passed function IS called.
    const myFn = jest.fn()
    const Component = () => {
      useState(myFn)
      return <Text>test</Text>
    }
    renderVoltraVariantToJson(<Component />)
    expect(myFn).toHaveBeenCalled()
  })

  test('5. useReducer basic', () => {
    // Call useReducer(reducer, { count: 0 }). Verify returns [{ count: 0 }, dispatch] where dispatch is a function.
    const reducer = (state, action) => state
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
    // Call useReducer(reducer, 5, (n) => ({ count: n * 2 })). Verify returns [{ count: 10 }, dispatch].
    const reducer = (state, action) => state
    const initFn = (n) => ({ count: n * 2 })
    let stateVal
    const Component = () => {
      ;[stateVal] = useReducer(reducer, 5, initFn)
      return <Text>test</Text>
    }
    renderVoltraVariantToJson(<Component />)
    expect(stateVal).toEqual({ count: 10 })
  })

  test('7. useMemo executes factory', () => {
    // Call useMemo(() => expensive(), []) with jest mock factory. Verify factory is called exactly once and its return value is used.
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
    // Call useMemo(() => value, [dep1, dep2]). Verify deps array is accepted (no error) but doesn't affect static render behavior.
    const Component = () => {
      useMemo(() => 'val', ['dep1', 'dep2'])
      return <Text>test</Text>
    }
    expect(() => renderVoltraVariantToJson(<Component />)).not.toThrow()
  })

  test('9. useCallback returns identity', () => {
    // Call const cb = useCallback(fn, []). Verify returned function is exactly fn (same reference).
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
    // Call useRef('initial'). Verify returns { current: 'initial' } object.
    let ref
    const Component = () => {
      ref = useRef('initial')
      return <Text>test</Text>
    }
    renderVoltraVariantToJson(<Component />)
    expect(ref).toEqual({ current: 'initial' })
  })

  test('11. useRef mutation', () => {
    // Call const ref = useRef(0); ref.current = 5; Verify mutation persists and ref.current equals 5 later in same render.
    // Note: Mutating ref during render is generally unsafe in concurrent React, but in synchronous render it might work.
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
    // Call useEffect(jest.fn(), []). Verify the effect callback is NOT called during render.
    const effect = jest.fn()
    const Component = () => {
      useEffect(effect, [])
      return <Text>test</Text>
    }
    renderVoltraVariantToJson(<Component />)
    expect(effect).not.toHaveBeenCalled()
  })

  test('13. useLayoutEffect is no-op', () => {
    // Call useLayoutEffect(jest.fn(), []). Verify the effect callback is NOT called during render.
    const effect = jest.fn()
    const Component = () => {
      useLayoutEffect(effect, [])
      return <Text>test</Text>
    }
    renderVoltraVariantToJson(<Component />)
    expect(effect).not.toHaveBeenCalled()
  })

  test('14. useId returns stable ID', () => {
    // Call useId() twice in same component. Verify each returns a unique non-empty string, different from each other.
    // Note: useId returns a stable ID per call site.
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
    // Component uses useState, then useMemo, then useCallback in order. Verify all work correctly.
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
    const fn = jest.fn()
    let eventFn
    const Component = () => {
      eventFn = useEffectEvent(fn)
      return <Text>test</Text>
    }
    renderVoltraVariantToJson(<Component />)
    expect(eventFn).toBe(fn)
  })
})
