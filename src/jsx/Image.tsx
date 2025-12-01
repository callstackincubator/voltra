import { Image as RNImage, ImageSourcePropType as RNImageSourcePropType } from 'react-native'

import { createVoltraComponent } from './createVoltraComponent'
import type { ImageProps as SwiftImageProps } from './props/Image'

export type ImageProps = Omit<SwiftImageProps, 'imageSourceKind' | 'imageSourceValue'> & {
  /**
   * React Native style image source. Supports `{ uri }`, `require(...)`, and numbers produced by bundlers.
   * When targeting Live Activities, ensure the image is stored in the shared App Group container and pass
   * `source={{ uri: 'app-group://filename.png' }}` after preloading.
   */
  source?: RNImageSourcePropType
  /**
   * Convenience alias for SF Symbols. Prefer `SymbolView` for richer control, but `systemName`
   * mirrors SwiftUI's `Image(systemName:)`.
   */
  systemName?: string
  /**
   * Asset catalog name bundled inside the widget extension.
   */
  assetName?: string
}

type NormalizedImageSource =
  | { kind: 'system'; value: string }
  | { kind: 'asset'; value: string }
  | { kind: 'uri'; value: string }
  | { kind: 'app-group'; value: string }

const APP_GROUP_PREFIXES = [/^app-group:\/\//i, /^appgroup:\/\//i]

function stripAppGroupPrefix(uri: string): string | null {
  for (const prefix of APP_GROUP_PREFIXES) {
    if (prefix.test(uri)) {
      return uri.replace(prefix, '')
    }
  }
  return null
}

function normalizeUriSource(raw: string): NormalizedImageSource | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const appGroup = stripAppGroupPrefix(trimmed)
  if (appGroup != null) {
    return { kind: 'app-group', value: appGroup }
  }
  return { kind: 'uri', value: trimmed }
}

function normalizeAssetName(raw: any): string | undefined {
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    return trimmed.length ? trimmed : undefined
  }
  return undefined
}

function resolveNumberSource(source: number): NormalizedImageSource | undefined {
  const resolver: any = RNImage?.resolveAssetSource
  if (typeof resolver !== 'function') return undefined
  try {
    const resolved = resolver(source)
    if (!resolved) return undefined
    if (resolved.uri && typeof resolved.uri === 'string') {
      const uriResult = normalizeUriSource(resolved.uri)
      if (uriResult) return uriResult
    }
    // React Native may expose the resource name via `name` or `asset.name`
    const assetName =
      (resolved.asset && typeof resolved.asset.name === 'string' && resolved.asset.name) ||
      (typeof resolved.name === 'string' && resolved.name)
    if (assetName) {
      return { kind: 'asset', value: String(assetName) }
    }
  } catch {
    // ignore resolution errors
  }
  return undefined
}

const normalizeImageSource = (props: ImageProps): NormalizedImageSource | undefined => {
  const systemName = normalizeAssetName(props.systemName)
  if (systemName) return { kind: 'system', value: systemName }

  const assetName = normalizeAssetName(props.assetName)
  if (assetName) return { kind: 'asset', value: assetName }

  const sourceProp = props.source
  if (sourceProp == null) return undefined

  if (Array.isArray(sourceProp)) {
    for (const entry of sourceProp) {
      const normalized = normalizeImageSource({ source: entry })
      if (normalized) return normalized
    }

    return undefined
  }

  if (typeof sourceProp === 'number') {
    const normalized = resolveNumberSource(sourceProp)
    if (normalized) return normalized
  }

  if (sourceProp && typeof sourceProp === 'object') {
    if (typeof sourceProp.uri === 'string') {
      const normalized = normalizeUriSource(sourceProp.uri)
      if (normalized) return normalized
    }
  }

  return undefined
}

export const Image = createVoltraComponent<ImageProps>('Image', {
  toJSON: (props) => {
    const normalizedSource = normalizeImageSource(props)
    const { source, ...otherProps } = props

    return {
      ...otherProps,
      imageSourceKind: normalizedSource?.kind,
      imageSourceValue: normalizedSource?.value,
    }
  },
})
