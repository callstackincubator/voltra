/// <reference types="node" />

import type { AndroidWidgetVariants } from '@voltra/android-server'
import { createWidgetUpdateExpressHandler as createSharedWidgetUpdateExpressHandler } from '@voltra/server'
import { createWidgetUpdateHandler as createSharedWidgetUpdateHandler } from '@voltra/server'
import { createWidgetUpdateNodeHandler as createSharedWidgetUpdateNodeHandler } from '@voltra/server'
import type {
  WidgetRenderRequest,
  WidgetUpdateExpressHandler,
  WidgetUpdateHandler,
  WidgetUpdateNodeHandler,
} from '@voltra/server'
import { renderAndroidWidgetToString } from '@voltra/android-server'
import { renderWidgetToString } from '@voltra/ios-server'
import type { WidgetVariants } from '@voltra/ios-server'

export { renderAndroidWidgetToString } from '@voltra/android-server'
export type { AndroidWidgetVariants } from '@voltra/android-server'
export { renderWidgetToString } from '@voltra/ios-server'
export type { WidgetVariants } from '@voltra/ios-server'
export type {
  WidgetRenderRequest,
  WidgetUpdateExpressHandler,
  WidgetUpdateHandler,
  WidgetUpdateNodeHandler,
} from '@voltra/server'
export type { WidgetPlatform, WidgetTheme } from '@voltra/server'

/**
 * Options for creating the widget update handler.
 */
export interface WidgetUpdateHandlerOptions {
  renderIos: (request: WidgetRenderRequest) => Promise<WidgetVariants | null> | WidgetVariants | null
  renderAndroid?: (request: WidgetRenderRequest) => Promise<AndroidWidgetVariants | null> | AndroidWidgetVariants | null
  validateToken?: (token: string) => Promise<boolean> | boolean
}

function toSharedOptions(options: WidgetUpdateHandlerOptions) {
  return {
    validateToken: options.validateToken,
    renderIos: async (request: WidgetRenderRequest) => {
      const variants = await options.renderIos(request)
      return variants ? renderWidgetToString(variants) : null
    },
    renderAndroid: options.renderAndroid
      ? async (request: WidgetRenderRequest) => {
          const variants = await options.renderAndroid?.(request)
          return variants ? renderAndroidWidgetToString(variants) : null
        }
      : undefined,
  }
}

export function createWidgetUpdateHandler(options: WidgetUpdateHandlerOptions): WidgetUpdateHandler {
  return createSharedWidgetUpdateHandler(toSharedOptions(options))
}

export function createWidgetUpdateNodeHandler(options: WidgetUpdateHandlerOptions): WidgetUpdateNodeHandler {
  return createSharedWidgetUpdateNodeHandler(toSharedOptions(options))
}

export function createWidgetUpdateExpressHandler(options: WidgetUpdateHandlerOptions): WidgetUpdateExpressHandler {
  return createSharedWidgetUpdateExpressHandler(toSharedOptions(options))
}
