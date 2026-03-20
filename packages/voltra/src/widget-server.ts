/// <reference types="node" />

import type { AndroidWidgetVariants } from '@voltrajs/android-server'
import { createWidgetUpdateExpressHandler as createSharedWidgetUpdateExpressHandler } from '@voltrajs/server'
import { createWidgetUpdateHandler as createSharedWidgetUpdateHandler } from '@voltrajs/server'
import { createWidgetUpdateNodeHandler as createSharedWidgetUpdateNodeHandler } from '@voltrajs/server'
import type {
  WidgetRenderRequest,
  WidgetUpdateExpressHandler,
  WidgetUpdateHandler,
  WidgetUpdateNodeHandler,
} from '@voltrajs/server'
import { renderAndroidWidgetToString } from '@voltrajs/android-server'
import { renderWidgetToString } from '@voltrajs/ios-server'
import type { WidgetVariants } from '@voltrajs/ios-server'

export { renderAndroidWidgetToString } from '@voltrajs/android-server'
export type { AndroidWidgetVariants } from '@voltrajs/android-server'
export { renderWidgetToString } from '@voltrajs/ios-server'
export type { WidgetVariants } from '@voltrajs/ios-server'
export type {
  WidgetRenderRequest,
  WidgetUpdateExpressHandler,
  WidgetUpdateHandler,
  WidgetUpdateNodeHandler,
} from '@voltrajs/server'
export type { WidgetPlatform, WidgetTheme } from '@voltrajs/server'

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
