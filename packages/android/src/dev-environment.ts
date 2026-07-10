declare const __DEV__: boolean | undefined

/**
 * Uses React Native's compile-time development flag when available, while
 * remaining safe to evaluate in Node-based renderers.
 */
export const isAndroidDevelopmentEnvironment = (): boolean => {
  if (typeof __DEV__ !== 'undefined') {
    return __DEV__
  }

  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'
}
