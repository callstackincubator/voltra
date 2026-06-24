import { withAndroid } from './android'
import { generateAndroidDynamicWidgetsManifest } from './android/files/manifest'
import type { VoltraAndroidConfigPlugin } from './types'
import { validateAndroidConfigPluginProps } from './validation'

function resolveScheme(config: unknown): string | undefined {
  const expoConfig = config as { scheme?: unknown; android?: { package?: unknown } }
  const rawScheme = expoConfig.scheme

  if (Array.isArray(rawScheme)) {
    const scheme = rawScheme.find((value) => typeof value === 'string' && value.trim())
    if (typeof scheme === 'string') {
      return scheme.trim()
    }
  }

  if (typeof rawScheme === 'string' && rawScheme.trim()) {
    return rawScheme.trim()
  }

  if (typeof expoConfig.android?.package === 'string' && expoConfig.android.package.trim()) {
    return expoConfig.android.package.trim()
  }

  return undefined
}

/**
 * Voltra Android Expo config plugin.
 *
 * Configures home screen widgets and optional notification manifest entries.
 */
const withVoltraAndroid: VoltraAndroidConfigPlugin = (config, props = {}) => {
  const projectRoot = (config as { modRequest?: { projectRoot?: string } }).modRequest?.projectRoot
  validateAndroidConfigPluginProps(props, projectRoot)

  const widgets = props.widgets ?? []
  const scheme = resolveScheme(config)

  if (scheme && !(config as { scheme?: unknown }).scheme) {
    ;(config as { scheme?: string }).scheme = scheme
  }

  config = generateAndroidDynamicWidgetsManifest(config, { widgets })

  if (!config.android?.package) {
    return config
  }

  if (widgets.length === 0 && !props.enableNotifications) {
    return config
  }

  return withAndroid(config, {
    enableNotifications: props.enableNotifications,
    widgets,
    ...(props.fonts ? { fonts: props.fonts } : {}),
    ...(scheme ? { scheme } : {}),
    ...(props.widgetConfigurationRoute ? { widgetConfigurationRoute: props.widgetConfigurationRoute } : {}),
  })
}

export default withVoltraAndroid

export type {
  AndroidConfigPluginProps,
  AndroidPluginProps,
  AndroidWidgetConfig,
  AndroidWidgetServerUpdateConfig,
  VoltraAndroidConfigPlugin,
} from './types'
