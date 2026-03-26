/// <reference types="node" />

import { createAndroidWidgetRenderContext } from '@use-voltra/android-server'
import type { AndroidWidgetVariants } from '@use-voltra/android-server'
import { renderAndroidWidgetToString } from '@use-voltra/android-server'
import { renderWidgetToString } from '@use-voltra/ios-server'
import type { WidgetVariants } from '@use-voltra/ios-server'
import { createWidgetUpdateExpressHandler as createSharedWidgetUpdateExpressHandler } from '@use-voltra/server'
import { createWidgetUpdateHandler as createSharedWidgetUpdateHandler } from '@use-voltra/server'
import { createWidgetUpdateNodeHandler as createSharedWidgetUpdateNodeHandler } from '@use-voltra/server'
import type {
  WidgetRenderRequest,
  WidgetUpdateExpressHandler,
  WidgetUpdateHandler,
  WidgetUpdateNodeHandler,
} from '@use-voltra/server'

export { renderAndroidWidgetToString } from '@use-voltra/android-server'
export type { AndroidWidgetVariants } from '@use-voltra/android-server'
export { renderWidgetToString } from '@use-voltra/ios-server'
export type { WidgetVariants } from '@use-voltra/ios-server'
export type {
  WidgetRenderRequest,
  WidgetUpdateExpressHandler,
  WidgetUpdateHandler,
  WidgetUpdateNodeHandler,
} from '@use-voltra/server'
export type { AndroidWidgetRenderContextValue } from '@use-voltra/android-server'
export type { WidgetPlatform, WidgetTheme } from '@use-voltra/server'

/**
 * Options for creating the widget update handler.
 */
export interface WidgetUpdateHandlerOptions {
  renderIos: (request: WidgetRenderRequest) => Promise<WidgetVariants | null> | WidgetVariants | null
  renderAndroid?: (request: WidgetRenderRequest) => Promise<AndroidWidgetVariants | null> | AndroidWidgetVariants | null
  validateToken?: (token: string) => Promise<boolean> | boolean
}

const toSharedOptions = (options: WidgetUpdateHandlerOptions) => {
  const renderAndroid = options.renderAndroid

  return {
    validateToken: options.validateToken,
    renderIos: async (request: WidgetRenderRequest) => {
      const variants = await options.renderIos(request)
      return variants ? renderWidgetToString(variants) : null
    },
    renderAndroid: renderAndroid
      ? async (request: WidgetRenderRequest) => {
          const variants = await renderAndroid(request)
          return variants
            ? renderAndroidWidgetToString(variants, { renderContext: createAndroidWidgetRenderContext(request) })
            : null
        }
      : undefined,
  }
}

export const createWidgetUpdateHandler = (options: WidgetUpdateHandlerOptions): WidgetUpdateHandler => {
  return createSharedWidgetUpdateHandler(toSharedOptions(options))
}

export const createWidgetUpdateNodeHandler = (options: WidgetUpdateHandlerOptions): WidgetUpdateNodeHandler => {
  return createSharedWidgetUpdateNodeHandler(toSharedOptions(options))
}

export const createWidgetUpdateExpressHandler = (options: WidgetUpdateHandlerOptions): WidgetUpdateExpressHandler => {
  return createSharedWidgetUpdateExpressHandler(toSharedOptions(options))
}
