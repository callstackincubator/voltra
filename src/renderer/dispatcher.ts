import React, { Context, ReactDispatcher, ReactHooksDispatcher } from 'react'

import { ContextRegistry } from './context-registry.js'

const REACT_CONTEXT_TYPE = Symbol.for('react.context')
const REACT_MEMO_CACHE_SENTINEL = Symbol.for('react.memo_cache_sentinel')

declare module 'react' {
  type HookFn = (...args: any[]) => any

  export type ReactHooksDispatcher = {
    useState: HookFn
    useReducer: HookFn
    useEffect: HookFn
    useLayoutEffect: HookFn
    useInsertionEffect: HookFn
    useCallback: HookFn
    useMemo: HookFn
    useRef: HookFn
    useContext: HookFn
    useId: HookFn
    useImperativeHandle: HookFn
    useDebugValue: HookFn
    useDeferredValue: HookFn
    useTransition: HookFn
    useSyncExternalStore: HookFn
    use: HookFn
    useActionState: HookFn
    useOptimistic: HookFn
    useEffectEvent: HookFn
    useMemoCache: HookFn
    useCacheRefresh: HookFn
  }

  export type ReactDispatcher = {
    H: ReactHooksDispatcher
  }

  let __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: ReactDispatcher
}

export const getHooksDispatcher = (registry: ContextRegistry): ReactHooksDispatcher => ({
  useContext: <T>(context: Context<T>) => registry.readContext(context),
  use: <T>(usable: React.Usable<T>): T => {
    if (
      usable !== null &&
      typeof usable === 'object' &&
      (usable as { $$typeof?: symbol }).$$typeof === REACT_CONTEXT_TYPE
    ) {
      return registry.readContext(usable as unknown as Context<T>)
    }

    if (
      usable !== null &&
      (typeof usable === 'object' || typeof usable === 'function') &&
      typeof (usable as { then?: unknown }).then === 'function'
    ) {
      throw new Error(
        'use() with promises is not supported in Voltra. Async data fetching is not available in this synchronous renderer.'
      )
    }

    throw new Error(`An unsupported type was passed to use(): ${String(usable)}`)
  },
  useState: <S>(initial?: S | (() => S)) => [
    typeof initial === 'function' ? (initial as () => S)() : initial,
    () => { }, // No-op setter
  ],
  useReducer: <S, I, A extends React.AnyActionArg>(
    _: (prevState: S, ...args: A) => S,
    initialArg: I,
    init?: (i: I) => S
  ): [S, React.ActionDispatch<A>] => {
    const state = init ? init(initialArg) : initialArg
    return [state as S, () => { }]
  },
  // Direct pass-throughs
  useMemo: (factory) => factory(),
  useCallback: (cb) => cb,
  useRef: (initial) => ({ current: initial }),
  // No-ops for effects
  useEffect: () => { },
  useLayoutEffect: () => { },
  useInsertionEffect: () => { },
  useId: () => Math.random().toString(36).substr(2, 9),
  useDebugValue: () => { },
  useImperativeHandle: () => { },
  useDeferredValue: <T>(value: T) => value,
  useTransition: () => [false, (func: () => void) => func()],
  useSyncExternalStore: (_, getSnapshot) => {
    return getSnapshot()
  },
  // No-op stubs for React 19 hooks
  useActionState: <S>(_: unknown, initialState: S, _permalink?: string) =>
    [initialState, () => { }, false] as [S, () => void, boolean],
  useOptimistic: <T>(passthrough: T) => [passthrough, () => { }] as [T, (action: unknown) => void],
  useEffectEvent: <T extends Function>(callback: T): T => callback,
  useMemoCache: (size: number) => {
    const data = new Array<unknown>(size)
    for (let i = 0; i < size; i++) {
      data[i] = REACT_MEMO_CACHE_SENTINEL
    }
    return data
  },
  useCacheRefresh: () => () => { },
})

export const getReactCurrentDispatcher = (): ReactDispatcher => {
  return React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
}
