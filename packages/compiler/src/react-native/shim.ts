/**
 * The `react-native` surface available to Voltra widget code.
 *
 * Widget code does not run against the React Native runtime: at build time it is
 * evaluated in a Node VM, and on device it runs in a separate JS engine with no
 * bridge and no native modules. Only the parts of `react-native` that are pure
 * data manipulation can be honoured, so this shim implements `StyleSheet` and
 * `Platform` and rejects everything else with an actionable message instead of
 * silently handing back `undefined`.
 */

import { describeUnsupportedReactNativeExport } from '../widget-module/policy.js'

type Style = Record<string, unknown>
type StyleInput = Style | false | null | undefined | ReadonlyArray<StyleInput>

function unsupported(symbol: string): never {
  throw new Error(describeUnsupportedReactNativeExport(symbol))
}

/**
 * Stand-in for a React Native export widget code cannot use.
 *
 * Importing it is harmless; rendering it, calling it, or reading anything off it throws.
 * A function proxy covers all three, so `<View />`, `Animated.timing(...)`, and
 * `new NativeEventEmitter()` all fail with the same message.
 */
function createRejectedExport(symbol: string): any {
  const reject = (): never => unsupported(symbol)

  return new Proxy(
    function rejectedReactNativeExport(): never {
      return reject()
    },
    {
      apply: reject,
      construct: reject,
      get(target, property) {
        // Symbols are read by tooling (React's element check, `util.inspect`) before anything
        // renders, so answering those keeps the error at the point of actual use.
        return typeof property === 'symbol' ? Reflect.get(target, property) : reject()
      },
    }
  )
}

const absoluteFillObject: Style = Object.freeze({
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
})

function flatten(style: StyleInput): Style {
  if (!style) {
    return {}
  }

  if (!Array.isArray(style)) {
    return style as Style
  }

  const flattened: Style = {}

  for (const entry of style) {
    const resolved = flatten(entry as StyleInput)

    for (const key of Object.keys(resolved)) {
      flattened[key] = resolved[key]
    }
  }

  return flattened
}

/**
 * `StyleSheet` is an identity mapping in Voltra: widget styles are plain objects that
 * are serialized into the widget payload, so there is no registry to allocate ids in.
 */
export const StyleSheet = Object.freeze({
  create<T extends Record<string, Style>>(styles: T): T {
    return styles
  },
  flatten,
  compose(first: StyleInput, second: StyleInput): StyleInput {
    if (first === null || first === undefined) {
      return second
    }

    return second === null || second === undefined ? first : [first, second]
  },
  absoluteFill: absoluteFillObject,
  absoluteFillObject,
  /**
   * Widgets are rendered by the host OS, which does not expose a screen scale to the
   * widget process, so the thinnest expressible line is a single point.
   */
  hairlineWidth: 1,
})

export const ActivityIndicator = createRejectedExport('ActivityIndicator')
export const Alert = createRejectedExport('Alert')
export const Animated = createRejectedExport('Animated')
export const AppRegistry = createRejectedExport('AppRegistry')
export const AppState = createRejectedExport('AppState')
export const Appearance = createRejectedExport('Appearance')
export const Button = createRejectedExport('Button')
export const DeviceEventEmitter = createRejectedExport('DeviceEventEmitter')
export const Dimensions = createRejectedExport('Dimensions')
export const Easing = createRejectedExport('Easing')
export const FlatList = createRejectedExport('FlatList')
export const I18nManager = createRejectedExport('I18nManager')
export const Image = createRejectedExport('Image')
export const ImageBackground = createRejectedExport('ImageBackground')
export const InteractionManager = createRejectedExport('InteractionManager')
export const Keyboard = createRejectedExport('Keyboard')
export const KeyboardAvoidingView = createRejectedExport('KeyboardAvoidingView')
export const LayoutAnimation = createRejectedExport('LayoutAnimation')
export const Linking = createRejectedExport('Linking')
export const Modal = createRejectedExport('Modal')
export const NativeEventEmitter = createRejectedExport('NativeEventEmitter')
export const NativeModules = createRejectedExport('NativeModules')
export const PanResponder = createRejectedExport('PanResponder')
export const PermissionsAndroid = createRejectedExport('PermissionsAndroid')
export const PixelRatio = createRejectedExport('PixelRatio')
export const Pressable = createRejectedExport('Pressable')
export const SafeAreaView = createRejectedExport('SafeAreaView')
export const ScrollView = createRejectedExport('ScrollView')
export const SectionList = createRejectedExport('SectionList')
export const Share = createRejectedExport('Share')
export const StatusBar = createRejectedExport('StatusBar')
export const Switch = createRejectedExport('Switch')
export const Text = createRejectedExport('Text')
export const TextInput = createRejectedExport('TextInput')
export const ToastAndroid = createRejectedExport('ToastAndroid')
export const TouchableHighlight = createRejectedExport('TouchableHighlight')
export const TouchableOpacity = createRejectedExport('TouchableOpacity')
export const TouchableWithoutFeedback = createRejectedExport('TouchableWithoutFeedback')
export const TurboModuleRegistry = createRejectedExport('TurboModuleRegistry')
export const UIManager = createRejectedExport('UIManager')
export const Vibration = createRejectedExport('Vibration')
export const View = createRejectedExport('View')
export const VirtualizedList = createRejectedExport('VirtualizedList')
export const findNodeHandle = createRejectedExport('findNodeHandle')
export const processColor = createRejectedExport('processColor')
export const requireNativeComponent = createRejectedExport('requireNativeComponent')
export const useColorScheme = createRejectedExport('useColorScheme')
export const useWindowDimensions = createRejectedExport('useWindowDimensions')
