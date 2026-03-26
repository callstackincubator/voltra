import React from 'react'
import { AndroidDynamicColors, VoltraAndroid } from 'voltra/android'

export type AndroidMaterialColorsRenderSource = 'client' | 'server' | 'initial'

type AndroidMaterialColorsWidgetProps = {
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

export const AndroidMaterialColorsWidget = ({ source, renderedAt }: AndroidMaterialColorsWidgetProps) => {
  const colors = AndroidDynamicColors

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
  return <AndroidMaterialColorsWidget source="server" renderedAt={renderedAt} />
}
