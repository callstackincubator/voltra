import React from 'react'
import { VoltraAndroid, useAndroidDynamicColorPalette, type AndroidDynamicColorPalette } from 'voltra/android'

export type AndroidMaterialColorsRenderSource = 'client' | 'server' | 'initial'

const FALLBACK_PALETTE: AndroidDynamicColorPalette = {
  primary: '#6750a4ff',
  onPrimary: '#ffffffff',
  primaryContainer: '#e9ddffff',
  onPrimaryContainer: '#22005dff',
  secondary: '#625b71ff',
  onSecondary: '#ffffffff',
  secondaryContainer: '#e8def8ff',
  onSecondaryContainer: '#1e192bff',
  tertiary: '#7d5260ff',
  onTertiary: '#ffffffff',
  tertiaryContainer: '#ffd9e3ff',
  onTertiaryContainer: '#31101dff',
  error: '#ba1a1aff',
  errorContainer: '#ffdad6ff',
  onError: '#ffffffff',
  onErrorContainer: '#410002ff',
  background: '#fef7ffff',
  onBackground: '#1d1b20ff',
  surface: '#fef7ffff',
  onSurface: '#1d1b20ff',
  surfaceVariant: '#e7e0ecff',
  onSurfaceVariant: '#49454eff',
  outline: '#7a757fff',
  inverseOnSurface: '#f4eff4ff',
  inverseSurface: '#322f35ff',
  inversePrimary: '#cfbcffff',
  widgetBackground: '#f7f2faff',
}

type AndroidMaterialColorsWidgetProps = {
  palette?: AndroidDynamicColorPalette | null
  source: AndroidMaterialColorsRenderSource
  renderedAt: string
}

const SOURCE_LABELS: Record<AndroidMaterialColorsRenderSource, string> = {
  client: 'Rendered in app',
  server: 'Rendered on server',
  initial: 'Initial placeholder',
}

const Swatch = ({
  label,
  backgroundColor,
  textColor,
}: {
  label: string
  backgroundColor: string
  textColor: string
}) => {
  return (
    <VoltraAndroid.Column
      style={{
        flex: 1,
        borderRadius: 18,
        padding: 10,
        marginRight: 8,
        backgroundColor,
      }}
      verticalAlignment="center-vertically"
    >
      <VoltraAndroid.Text style={{ fontSize: 10, fontWeight: '600', color: textColor, opacity: 0.72 }}>
        {label}
      </VoltraAndroid.Text>
      <VoltraAndroid.Spacer style={{ height: 6 }} />
      <VoltraAndroid.Text style={{ fontSize: 13, fontWeight: '700', color: textColor }}>
        {backgroundColor.slice(0, 7).toUpperCase()}
      </VoltraAndroid.Text>
    </VoltraAndroid.Column>
  )
}

export const AndroidMaterialColorsWidget = ({ palette, source, renderedAt }: AndroidMaterialColorsWidgetProps) => {
  const colors = palette ?? FALLBACK_PALETTE

  return (
    <VoltraAndroid.Box
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: colors.widgetBackground,
        borderRadius: 28,
        padding: 16,
      }}
    >
      <VoltraAndroid.Column style={{ width: '100%', height: '100%' }}>
        <VoltraAndroid.Row style={{ width: '100%' }} verticalAlignment="center-vertically">
          <VoltraAndroid.Column style={{ flex: 1 }}>
            <VoltraAndroid.Text style={{ fontSize: 11, fontWeight: '600', color: colors.onSurfaceVariant }}>
              Material You
            </VoltraAndroid.Text>
            <VoltraAndroid.Spacer style={{ height: 4 }} />
            <VoltraAndroid.Text style={{ fontSize: 18, fontWeight: '700', color: colors.onBackground }}>
              Dynamic Colors
            </VoltraAndroid.Text>
          </VoltraAndroid.Column>

          <VoltraAndroid.Box
            style={{
              backgroundColor: colors.primaryContainer,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <VoltraAndroid.Text style={{ fontSize: 10, fontWeight: '700', color: colors.onPrimaryContainer }}>
              {SOURCE_LABELS[source]}
            </VoltraAndroid.Text>
          </VoltraAndroid.Box>
        </VoltraAndroid.Row>

        <VoltraAndroid.Spacer style={{ height: 14 }} />

        <VoltraAndroid.Row style={{ width: '100%' }}>
          <Swatch label="Primary" backgroundColor={colors.primary} textColor={colors.onPrimary} />
          <Swatch label="Secondary" backgroundColor={colors.secondary} textColor={colors.onSecondary} />
          <Swatch label="Tertiary" backgroundColor={colors.tertiary} textColor={colors.onTertiary} />
        </VoltraAndroid.Row>

        <VoltraAndroid.Spacer style={{ height: 12 }} />

        <VoltraAndroid.Box
          style={{
            width: '100%',
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 12,
          }}
        >
          <VoltraAndroid.Column style={{ width: '100%', height: '100%' }}>
            <VoltraAndroid.Text style={{ fontSize: 13, fontWeight: '600', color: colors.onSurface }}>
              The widget should match your wallpaper-driven palette.
            </VoltraAndroid.Text>
            <VoltraAndroid.Spacer style={{ flex: 1 }} />
            <VoltraAndroid.Text style={{ fontSize: 11, color: colors.onSurfaceVariant }}>
              Updated {renderedAt}
            </VoltraAndroid.Text>
          </VoltraAndroid.Column>
        </VoltraAndroid.Box>
      </VoltraAndroid.Column>
    </VoltraAndroid.Box>
  )
}

export const AndroidMaterialColorsServerWidget = ({ renderedAt }: { renderedAt: string }) => {
  const palette = useAndroidDynamicColorPalette()

  return <AndroidMaterialColorsWidget palette={palette} source="server" renderedAt={renderedAt} />
}
