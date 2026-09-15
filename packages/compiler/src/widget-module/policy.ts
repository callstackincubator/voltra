/**
 * Widget module import policy.
 *
 * Widget source is evaluated in three different environments:
 *
 * - the Voltra CLI's `apply` pipeline (Node VM),
 * - the Expo config plugins' prebuild prerender (Node VM),
 * - Metro, when bundling a Dynamic Widget for the device.
 *
 * All three must agree on what a widget file is allowed to import and what each
 * specifier resolves to, otherwise a widget that prerenders successfully can still
 * fail to bundle — or worse, render differently on device than it did at build time.
 * This module is the single source of truth for that contract.
 */

/** Platform a widget module is being loaded or bundled for. */
export type WidgetModulePlatform = 'ios' | 'android'

/**
 * Client packages carry the native bridge and app-side runtime. They cannot be
 * evaluated outside the app, so widget code that imports them is served the
 * matching rendering package instead.
 */
const PACKAGE_ALIASES: Readonly<Record<string, string>> = {
  '@use-voltra/ios-client': '@use-voltra/ios',
  '@use-voltra/android-client': '@use-voltra/android',
}

/** Package that hosts the `react-native` shim served to widget code. */
export const WIDGET_REACT_NATIVE_SHIM_PACKAGE = '@use-voltra/compiler'

/** Specifier of the `react-native` shim for a given platform. */
export function getWidgetReactNativeShimSpecifier(platform: WidgetModulePlatform): string {
  return `${WIDGET_REACT_NATIVE_SHIM_PACKAGE}/react-native/${platform}`
}

/** Symbols the `react-native` shim implements. Anything else is rejected. */
export const SUPPORTED_REACT_NATIVE_EXPORTS = ['Platform', 'StyleSheet'] as const

/**
 * React Native exports widget code is most likely to reach for by mistake.
 *
 * The Node loader rejects *any* unimplemented symbol, but a Metro bundle resolves the shim
 * file directly and has no such interception point. Naming these explicitly means a widget
 * that slips one past build-time evaluation still fails loudly on device with the same
 * message, rather than silently reading `undefined`.
 */
export const REJECTED_REACT_NATIVE_EXPORTS = [
  'ActivityIndicator',
  'Alert',
  'Animated',
  'AppRegistry',
  'AppState',
  'Appearance',
  'Button',
  'DeviceEventEmitter',
  'Dimensions',
  'Easing',
  'FlatList',
  'I18nManager',
  'Image',
  'ImageBackground',
  'InteractionManager',
  'Keyboard',
  'KeyboardAvoidingView',
  'LayoutAnimation',
  'Linking',
  'Modal',
  'NativeEventEmitter',
  'NativeModules',
  'PanResponder',
  'PermissionsAndroid',
  'PixelRatio',
  'Pressable',
  'SafeAreaView',
  'ScrollView',
  'SectionList',
  'Share',
  'StatusBar',
  'Switch',
  'Text',
  'TextInput',
  'ToastAndroid',
  'TouchableHighlight',
  'TouchableOpacity',
  'TouchableWithoutFeedback',
  'TurboModuleRegistry',
  'UIManager',
  'Vibration',
  'View',
  'VirtualizedList',
  'findNodeHandle',
  'processColor',
  'requireNativeComponent',
  'useColorScheme',
  'useWindowDimensions',
] as const

/** How an import from widget code should be handled. */
export type WidgetImportResolution =
  /** Resolve the specifier as written. */
  | { kind: 'passthrough' }
  /** Resolve `specifier` instead of the requested one. */
  | { kind: 'alias'; specifier: string; warning?: string }
  /** Reject the import with `reason`. */
  | { kind: 'blocked'; reason: string }

function isReactNativeRoot(specifier: string): boolean {
  return specifier === 'react-native'
}

function isReactNativeDeepImport(specifier: string): boolean {
  return specifier.startsWith('react-native/')
}

/** Whether a specifier reaches for React Native, either its entry point or a deep path. */
export function isReactNativeImport(specifier: string): boolean {
  return isReactNativeRoot(specifier) || isReactNativeDeepImport(specifier)
}

/** Decide how a bare import from widget code should be resolved. */
export function resolveWidgetImport(specifier: string, platform: WidgetModulePlatform): WidgetImportResolution {
  if (isReactNativeRoot(specifier)) {
    return { kind: 'alias', specifier: getWidgetReactNativeShimSpecifier(platform) }
  }

  if (isReactNativeDeepImport(specifier)) {
    return { kind: 'blocked', reason: describeBlockedWidgetImport(specifier) }
  }

  const aliasedPackage = PACKAGE_ALIASES[specifier]

  if (aliasedPackage) {
    return {
      kind: 'alias',
      specifier: aliasedPackage,
      warning: `Widget code imported '${specifier}'. Using '${aliasedPackage}' instead.`,
    }
  }

  return { kind: 'passthrough' }
}

/** Message shown when widget code imports something it cannot use. */
export function describeBlockedWidgetImport(specifier: string): string {
  return (
    `Voltra widget code cannot import '${specifier}'. ` +
    `Only ${SUPPORTED_REACT_NATIVE_EXPORTS.join(' and ')} are available from 'react-native'; ` +
    "use the components exported by '@use-voltra/ios' or '@use-voltra/android' for everything else."
  )
}

/** Message shown when widget code reaches for a `react-native` symbol the shim does not implement. */
export function describeUnsupportedReactNativeExport(symbol: string): string {
  return (
    `'${symbol}' is not available to Voltra widget code. ` +
    `Only ${SUPPORTED_REACT_NATIVE_EXPORTS.join(' and ')} are available from 'react-native'; ` +
    "use the components exported by '@use-voltra/ios' or '@use-voltra/android' for everything else."
  )
}
