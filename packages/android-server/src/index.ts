/// <reference types="node" />

import { createVoltraRenderer } from '@use-voltra/core'
export {
  AndroidOngoingNotification,
  renderAndroidOngoingNotificationPayload,
  renderAndroidOngoingNotificationPayloadToJson,
} from '@use-voltra/android/server'
import { getAndroidComponentId } from '@use-voltra/android'
import type {
  WidgetRenderRequest,
  WidgetUpdateExpressHandler,
  WidgetUpdateHandler,
  WidgetUpdateNodeHandler,
} from '@use-voltra/server'
import {
  createWidgetUpdateExpressHandler,
  createWidgetUpdateHandler,
  createWidgetUpdateNodeHandler,
} from '@use-voltra/server'
import { createElement, Fragment as ReactFragment, type ReactNode } from 'react'

export type {
  AndroidOngoingNotificationActionPayload,
  AndroidOngoingNotificationActionProps,
  AndroidOngoingNotificationBigTextPayload,
  AndroidOngoingNotificationBigTextProps,
  AndroidOngoingNotificationContent,
  AndroidOngoingNotificationPayload,
  AndroidOngoingNotificationProgressPayload,
  AndroidOngoingNotificationProgressPoint,
  AndroidOngoingNotificationProgressProps,
  AndroidOngoingNotificationProgressSegment,
} from '@use-voltra/android/server'
export type {
  WidgetRenderRequest,
  WidgetUpdateExpressHandler,
  WidgetUpdateHandler,
  WidgetUpdateNodeHandler,
} from '@use-voltra/server'
export type { AndroidColorValue, AndroidDynamicColorRole, AndroidDynamicColorToken } from '@use-voltra/android'
export type { WidgetPlatform, WidgetTheme } from '@use-voltra/server'

export type AndroidWidgetSize = {
  width: number
  height: number
}

export type AndroidWidgetSizeVariant = {
  size: AndroidWidgetSize
  content: ReactNode
}

export type AndroidWidgetVariants = AndroidWidgetSizeVariant[]

type AndroidWidgetRenderOptions = Record<string, never>

const androidComponentRegistry = {
  getComponentId: getAndroidComponentId,
}

export const renderAndroidWidgetToJson = (
  variants: AndroidWidgetVariants,
  _options?: AndroidWidgetRenderOptions
): Record<string, any> => {
  const renderer = createVoltraRenderer(androidComponentRegistry)

  for (const { size, content } of variants) {
    if (content === null || content === undefined) {
      continue
    }

    const key = `${size.width}x${size.height}`
    renderer.addRootNode(key, createElement(ReactFragment, null, content))
  }

  const rendered = renderer.render()
  const variantsMap: Record<string, any> = {}
  const metadataKeys = ['v', 's', 'e']

  for (const key of Object.keys(rendered)) {
    if (!metadataKeys.includes(key)) {
      variantsMap[key] = rendered[key]
      delete rendered[key]
    }
  }

  rendered.variants = variantsMap

  return rendered
}

export const renderAndroidWidgetToString = (
  variants: AndroidWidgetVariants,
  options?: AndroidWidgetRenderOptions
): string => {
  return JSON.stringify(renderAndroidWidgetToJson(variants, options))
}

export interface AndroidWidgetUpdateHandlerOptions {
  render: (request: WidgetRenderRequest) => Promise<AndroidWidgetVariants | null> | AndroidWidgetVariants | null
  validateToken?: (token: string) => Promise<boolean> | boolean
}

const toSharedOptions = (options: AndroidWidgetUpdateHandlerOptions) => {
  return {
    validateToken: options.validateToken,
    renderAndroid: async (request: WidgetRenderRequest) => {
      const variants = await options.render(request)
      return variants ? renderAndroidWidgetToString(variants) : null
    },
  }
}

export const createAndroidWidgetUpdateHandler = (options: AndroidWidgetUpdateHandlerOptions): WidgetUpdateHandler => {
  return createWidgetUpdateHandler(toSharedOptions(options))
}

export const createAndroidWidgetUpdateNodeHandler = (
  options: AndroidWidgetUpdateHandlerOptions
): WidgetUpdateNodeHandler => {
  return createWidgetUpdateNodeHandler(toSharedOptions(options))
}

export const createAndroidWidgetUpdateExpressHandler = (
  options: AndroidWidgetUpdateHandlerOptions
): WidgetUpdateExpressHandler => {
  return createWidgetUpdateExpressHandler(toSharedOptions(options))
}
