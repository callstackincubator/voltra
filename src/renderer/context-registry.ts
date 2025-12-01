import { Context } from 'react'

declare module 'react' {
  interface Context<T> {
    _currentValue: T
  }
}

export type ContextRegistry = {
  pushProvider: <T>(context: Context<T>, value: T) => void
  popProvider: <T>(context: Context<T>) => void
  readContext: <T>(context: Context<T>) => T
}

export const getContextRegistry = (): ContextRegistry => {
  const contextMap = new Map()

  return {
    pushProvider: <T>(context: Context<T>, value: T) => {
      const stack = contextMap.get(context) || []
      stack.push(value)
      contextMap.set(context, stack)
    },
    popProvider: <T>(context: Context<T>) => {
      const stack = contextMap.get(context)
      if (stack) {
        stack.pop()
      }
    },
    readContext: <T>(context: Context<T>) => {
      const stack = contextMap.get(context)

      // If stack has items, return top.
      if (stack && stack.length > 0) {
        return stack[stack.length - 1]
      }

      // If empty/undefined, return the default value (defined at creation time).
      return context._currentValue // The default value passed to createContext()
    },
  }
}
