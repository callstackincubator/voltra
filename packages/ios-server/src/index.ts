/// <reference types="node" />

import { promisify } from 'node:util'
import { brotliCompress, constants } from 'node:zlib'

import { type ComponentRegistry, createVoltraRenderer, ensurePayloadWithinBudget } from '@use-voltra/core'
import type { LiveActivityVariants, WidgetVariants } from '@use-voltra/ios'
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
import type { ReactNode } from 'react'

export { Voltra } from '@use-voltra/ios'
export type { LiveActivityVariants, WidgetVariants }
export type {
  WidgetRenderRequest,
  WidgetUpdateExpressHandler,
  WidgetUpdateHandler,
  WidgetUpdateNodeHandler,
} from '@use-voltra/server'
export type { WidgetPlatform, WidgetTheme } from '@use-voltra/server'

type LiveActivityJson = {
  v: number
  s?: Record<string, unknown>[]
  e?: unknown[]
  ls?: unknown
  ls_background_tint?: string
  isl_keyline_tint?: string
  isl_exp_c?: unknown
  isl_exp_l?: unknown
  isl_exp_t?: unknown
  isl_exp_b?: unknown
  isl_cmp_l?: unknown
  isl_cmp_t?: unknown
  isl_min?: unknown
  saf_sm?: unknown
}

type LockScreenVariantObject = {
  content?: ReactNode
  activityBackgroundTint?: string
}

const COMPONENT_NAME_TO_ID: Record<string, number> = {
  Text: 0,
  Button: 1,
  Label: 2,
  Image: 3,
  Symbol: 4,
  Toggle: 5,
  LinearProgressView: 6,
  CircularProgressView: 7,
  Gauge: 8,
  Timer: 9,
  LinearGradient: 10,
  VStack: 11,
  HStack: 12,
  ZStack: 13,
  GroupBox: 14,
  GlassContainer: 15,
  Spacer: 16,
  Divider: 17,
  Mask: 18,
  Link: 19,
  View: 20,
  Chart: 21,
  ControlIf: 22,
  ControlSwitch: 23,
}

const defaultComponentRegistry: ComponentRegistry = {
  getComponentId: (name: string) => {
    const id = COMPONENT_NAME_TO_ID[name]
    if (id === undefined) {
      throw new Error(
        `Unknown component name: "${name}". Available components: ${Object.keys(COMPONENT_NAME_TO_ID).join(', ')}`
      )
    }

    return id
  },
}

const brotliCompressAsync = promisify(brotliCompress)

function isLockScreenVariantObject(value: LiveActivityVariants['lockScreen']): value is LockScreenVariantObject {
  return typeof value === 'object' && value !== null && ('content' in value || 'activityBackgroundTint' in value)
}

const compressPayload = async (jsonString: string): Promise<string> => {
  const jsonBuffer = Buffer.from(jsonString, 'utf8')

  const compressedBuffer = await brotliCompressAsync(jsonBuffer, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 2,
      [constants.BROTLI_PARAM_SIZE_HINT]: jsonBuffer.length,
    },
  })

  return compressedBuffer.toString('base64')
}

export const renderWidgetToJson = (variants: WidgetVariants): Record<string, any> => {
  const renderer = createVoltraRenderer(defaultComponentRegistry)

  for (const [family, content] of Object.entries(variants) as [string, WidgetVariants[keyof WidgetVariants]][]) {
    if (content !== undefined && content !== null) {
      renderer.addRootNode(family, content as NonNullable<WidgetVariants[keyof WidgetVariants]>)
    }
  }

  return renderer.render()
}

export const renderWidgetToString = (variants: WidgetVariants): string => {
  return JSON.stringify(renderWidgetToJson(variants))
}

export const renderLiveActivityToJson = (variants: LiveActivityVariants): LiveActivityJson => {
  const renderer = createVoltraRenderer(defaultComponentRegistry)

  if (variants.lockScreen) {
    const lockScreenVariant = variants.lockScreen
    if (isLockScreenVariantObject(lockScreenVariant)) {
      if (lockScreenVariant.content) {
        renderer.addRootNode('ls', lockScreenVariant.content)
      }
    } else {
      renderer.addRootNode('ls', lockScreenVariant as ReactNode)
    }
  }

  if (variants.island) {
    if (variants.island.expanded) {
      if (variants.island.expanded.center) {
        renderer.addRootNode('isl_exp_c', variants.island.expanded.center)
      }
      if (variants.island.expanded.leading) {
        renderer.addRootNode('isl_exp_l', variants.island.expanded.leading)
      }
      if (variants.island.expanded.trailing) {
        renderer.addRootNode('isl_exp_t', variants.island.expanded.trailing)
      }
      if (variants.island.expanded.bottom) {
        renderer.addRootNode('isl_exp_b', variants.island.expanded.bottom)
      }
    }
    if (variants.island.compact) {
      if (variants.island.compact.leading) {
        renderer.addRootNode('isl_cmp_l', variants.island.compact.leading)
      }
      if (variants.island.compact.trailing) {
        renderer.addRootNode('isl_cmp_t', variants.island.compact.trailing)
      }
    }
    if (variants.island.minimal) {
      renderer.addRootNode('isl_min', variants.island.minimal)
    }
  }

  if (variants.supplementalActivityFamilies?.small) {
    renderer.addRootNode('saf_sm', variants.supplementalActivityFamilies.small)
  }

  const result = renderer.render() as LiveActivityJson

  if (
    variants.lockScreen &&
    typeof variants.lockScreen === 'object' &&
    'activityBackgroundTint' in variants.lockScreen &&
    variants.lockScreen.activityBackgroundTint
  ) {
    result.ls_background_tint = variants.lockScreen.activityBackgroundTint
  }

  if (variants.island?.keylineTint) {
    result.isl_keyline_tint = variants.island.keylineTint
  }

  return result
}

export const renderLiveActivityToString = async (variants: LiveActivityVariants): Promise<string> => {
  const jsonString = JSON.stringify(renderLiveActivityToJson(variants))
  const compressedBase64 = await compressPayload(jsonString)
  ensurePayloadWithinBudget(compressedBase64)

  return compressedBase64
}

export interface IOSWidgetUpdateHandlerOptions {
  render: (request: WidgetRenderRequest) => Promise<WidgetVariants | null> | WidgetVariants | null
  validateToken?: (token: string) => Promise<boolean> | boolean
}

function toSharedOptions(options: IOSWidgetUpdateHandlerOptions) {
  return {
    validateToken: options.validateToken,
    renderIos: async (request: WidgetRenderRequest) => {
      const variants = await options.render(request)
      return variants ? renderWidgetToString(variants) : null
    },
  }
}

export function createIOSWidgetUpdateHandler(options: IOSWidgetUpdateHandlerOptions): WidgetUpdateHandler {
  return createWidgetUpdateHandler(toSharedOptions(options))
}

export function createIOSWidgetUpdateNodeHandler(options: IOSWidgetUpdateHandlerOptions): WidgetUpdateNodeHandler {
  return createWidgetUpdateNodeHandler(toSharedOptions(options))
}

export function createIOSWidgetUpdateExpressHandler(
  options: IOSWidgetUpdateHandlerOptions
): WidgetUpdateExpressHandler {
  return createWidgetUpdateExpressHandler(toSharedOptions(options))
}
