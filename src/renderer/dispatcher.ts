import React, { Context, ReactDispatcher, ReactHooksDispatcher } from 'react'

import { ContextRegistry } from './context-registry'

declare module 'react' {
  export type ReactHooksDispatcher = {
    useState: typeof import('react').useState
    useReducer: typeof import('react').useReducer
    useEffect: typeof import('react').useEffect
    useLayoutEffect: typeof import('react').useLayoutEffect
    useInsertionEffect: typeof import('react').useInsertionEffect
    useCallback: typeof import('react').useCallback
    useMemo: typeof import('react').useMemo
    useRef: typeof import('react').useRef
    useContext: typeof import('react').useContext
    useId: typeof import('react').useId
    useImperativeHandle: typeof import('react').useImperativeHandle
    useDebugValue: typeof import('react').useDebugValue
    useDeferredValue: typeof import('react').useDeferredValue
    useTransition: typeof import('react').useTransition
    useSyncExternalStore: typeof import('react').useSyncExternalStore
  }

  export type ReactDispatcher = {
    H: ReactHooksDispatcher
  }

  let __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: ReactDispatcher
}

export const getHooksDispatcher = (registry: ContextRegistry): ReactHooksDispatcher => ({
  useContext: <T>(context: Context<T>) => registry.readContext(context),
  useState: <S>(initial?: S | (() => S)) => [
    typeof initial === 'function' ? (initial as () => S)() : initial,
    () => {}, // No-op setter
  ],
  useReducer: <S, I, A extends React.AnyActionArg>(
    _: (prevState: S, ...args: A) => S,
    initialArg: I,
    init?: (i: I) => S
  ): [S, React.ActionDispatch<A>] => {
    const state = init ? init(initialArg) : initialArg
    return [state as S, () => {}]
  },
  // Direct pass-throughs
  useMemo: (factory) => factory(),
  useCallback: (cb) => cb,
  useRef: (initial) => ({ current: initial }),
  // No-ops for effects
  useEffect: () => {},
  useLayoutEffect: () => {},
  useInsertionEffect: () => {},
  useId: () => Math.random().toString(36).substr(2, 9),
  useDebugValue: () => {},
  useImperativeHandle: () => {},
  useDeferredValue: <T>(value: T) => value,
  useTransition: () => [false, (func: () => void) => func()],
  useSyncExternalStore: (_, getSnapshot) => {
    return getSnapshot()
  },
})

export const getReactCurrentDispatcher = (): ReactDispatcher => {
  return React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
}
