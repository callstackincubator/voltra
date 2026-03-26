/// <reference types="node" />

import {
  AndroidWidgetRenderContextProvider,
  createAndroidWidgetRenderContextValue,
  type AndroidWidgetRenderContextValue,
} from '@use-voltra/android/internal'
import { createVoltraRenderer } from '@use-voltra/core'
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
import { createElement, type ReactNode } from 'react'

export type {
  WidgetRenderRequest,
  WidgetUpdateExpressHandler,
  WidgetUpdateHandler,
  WidgetUpdateNodeHandler,
} from '@use-voltra/server'
export type { AndroidDynamicColorPalette, AndroidWidgetRenderContextValue } from '@use-voltra/android'
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

export type AndroidLiveUpdateVariants = {
  collapsed?: ReactNode
  expanded?: ReactNode
  smallIcon?: string
  channelId?: string
}

export type AndroidLiveUpdateVariantsJson = {
  v: number
  s?: Record<string, unknown>[]
  e?: unknown[]
  collapsed?: unknown
  expanded?: unknown
  smallIcon?: string
  channelId?: string
}

export type AndroidLiveUpdateJson = AndroidLiveUpdateVariantsJson

type AndroidWidgetRenderOptions = {
  renderContext?: AndroidWidgetRenderContextValue
}

const ANDROID_COMPONENT_NAME_TO_ID: Record<string, number> = {
  AndroidFilledButton: 0,
  AndroidImage: 1,
  AndroidSwitch: 2,
  AndroidCheckBox: 3,
  AndroidRadioButton: 4,
  AndroidBox: 5,
  AndroidButton: 6,
  AndroidCircleIconButton: 7,
  AndroidCircularProgressIndicator: 8,
  AndroidColumn: 9,
  AndroidLazyColumn: 10,
  AndroidLazyVerticalGrid: 11,
  AndroidLinearProgressIndicator: 12,
  AndroidOutlineButton: 13,
  AndroidRow: 14,
  AndroidScaffold: 15,
  AndroidSpacer: 16,
  AndroidSquareIconButton: 17,
  AndroidText: 18,
  AndroidTitleBar: 19,
  AndroidChart: 20,
}

const getAndroidComponentId = (name: string): number => {
  const id = ANDROID_COMPONENT_NAME_TO_ID[name]
  if (id === undefined) {
    throw new Error(
      `Unknown Android component name: "${name}". Available components: ${Object.keys(
        ANDROID_COMPONENT_NAME_TO_ID
      ).join(', ')}`
    )
  }

  return id
}

const androidComponentRegistry = {
  getComponentId: (name: string) => getAndroidComponentId(name),
}

export const renderAndroidLiveUpdateToJson = (
  variants: AndroidLiveUpdateVariants
): AndroidLiveUpdateJson => {
  const renderer = createVoltraRenderer(androidComponentRegistry)

  if (variants.collapsed) {
    renderer.addRootNode('collapsed', variants.collapsed)
  }

  if (variants.expanded) {
    renderer.addRootNode('expanded', variants.expanded)
  }

  const result = renderer.render() as AndroidLiveUpdateJson

  if (variants.smallIcon) {
    result.smallIcon = variants.smallIcon
  }

  if (variants.channelId) {
    result.channelId = variants.channelId
  }

  return result
}

export const renderAndroidLiveUpdateToString = (
  variants: AndroidLiveUpdateVariants
): string => {
  return JSON.stringify(renderAndroidLiveUpdateToJson(variants))
}

export const renderAndroidWidgetToJson = (
  variants: AndroidWidgetVariants,
  options?: AndroidWidgetRenderOptions
): Record<string, any> => {
  const renderer = createVoltraRenderer(androidComponentRegistry)
  const renderContext = options?.renderContext ?? { theme: null, dynamicColorPalette: null }

  for (const { size, content } of variants) {
    if (content === null || content === undefined) {
      continue
    }

    const key = `${size.width}x${size.height}`
    renderer.addRootNode(
      key,
      createElement(AndroidWidgetRenderContextProvider, {
        value: renderContext,
      }, content)
    )
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

export const createAndroidWidgetRenderContext = (
  request: Pick<WidgetRenderRequest, 'theme' | 'url'>
) : AndroidWidgetRenderContextValue => {
  return createAndroidWidgetRenderContextValue(request.theme, request.url.searchParams.get('androidPalette'))
}

const toSharedOptions = (options: AndroidWidgetUpdateHandlerOptions) => {
  return {
    validateToken: options.validateToken,
    renderAndroid: async (request: WidgetRenderRequest) => {
      const variants = await options.render(request)
      return variants ? renderAndroidWidgetToString(variants, { renderContext: createAndroidWidgetRenderContext(request) }) : null
    },
  }
}

export const createAndroidWidgetUpdateHandler = (
  options: AndroidWidgetUpdateHandlerOptions
): WidgetUpdateHandler => {
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
