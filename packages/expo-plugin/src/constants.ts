import type { WidgetFamily } from './types'

/**
 * Constants for the Voltra plugin
 */

// ============================================================================
// iOS Constants
// ============================================================================

export const IOS = {
  /** Minimum iOS deployment target version */
  DEPLOYMENT_TARGET: '17.0',

  /** Swift language version */
  SWIFT_VERSION: '5.0',

  /** Target device families (1 = iPhone, 2 = iPad) */
  DEVICE_FAMILY: '1,2',

  /** Last Swift migration version for Xcode */
  LAST_SWIFT_MIGRATION: 1250,
} as const

// ============================================================================
// Path Constants
// ============================================================================

/** Default path for user-provided widget images */
export const DEFAULT_USER_IMAGES_PATH = './assets/voltra'

/** Default path for user-provided Android widget images */
export const DEFAULT_ANDROID_USER_IMAGES_PATH = './assets/voltra-android'

// ============================================================================
// Widget Constants
// ============================================================================

/** Maximum image size in bytes for Live Activities (4KB limit) */
export const MAX_IMAGE_SIZE_BYTES = 4096

/** Supported image extensions for widget assets */
export const SUPPORTED_IMAGE_EXTENSIONS = /\.(png|jpg|jpeg)$/i

/** Default widget families when not specified */
export const DEFAULT_WIDGET_FAMILIES: WidgetFamily[] = ['systemSmall', 'systemMedium', 'systemLarge']

/** Maps JS widget family names to SwiftUI WidgetFamily enum cases */
export const WIDGET_FAMILY_MAP: Record<WidgetFamily, string> = {
  systemSmall: '.systemSmall',
  systemMedium: '.systemMedium',
  systemLarge: '.systemLarge',
  systemExtraLarge: '.systemExtraLarge',
  accessoryCircular: '.accessoryCircular',
  accessoryRectangular: '.accessoryRectangular',
  accessoryInline: '.accessoryInline',
}

/** Extensions to try when resolving module paths for pre-rendering */
export const MODULE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '']
