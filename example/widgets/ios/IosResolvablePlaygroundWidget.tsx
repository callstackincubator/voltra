import React from 'react'
import { env, eq, when, Voltra, type WidgetVariants } from '@use-voltra/ios'

type WidgetSize =
  | 'small'
  | 'medium'
  | 'accessoryCircular'
  | 'accessoryRectangular'
  | 'accessoryInline'

/** Per-mode label text color (avoids nesting `match` inside `when` for style types). */
const labelByMode = when(
  eq(env.renderingMode, 'accented'),
  '#CBD5E1',
  when(eq(env.renderingMode, 'fullColor'), '#475569', '#FBCFE8')
)

/** Per-mode primary text / active border color. */
const valueByMode = when(
  eq(env.renderingMode, 'accented'),
  '#F9FAFB',
  when(eq(env.renderingMode, 'fullColor'), '#0F172A', '#FDF2F8')
)

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => {
  return (
    <Voltra.View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Voltra.Text
        style={{
          width: 78,
          fontSize: 12,
          fontWeight: '600',
          color: labelByMode,
        }}
      >
        {label}
      </Voltra.Text>

      <Voltra.View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {children}
      </Voltra.View>
    </Voltra.View>
  )
}

const ModeSwitch = ({ box, fontSize }: { box: number; fontSize: number }) => (
  <Voltra.ControlSwitch
    value={env.renderingMode}
    cases={{
      accented: (
        <Voltra.View
          style={{
            width: box,
            height: box,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: '#F9FAFB',
            borderRadius: 4,
          }}
        >
          <Voltra.Text style={{ fontSize, fontWeight: '700', color: valueByMode }}>A</Voltra.Text>
        </Voltra.View>
      ),
      fullColor: (
        <Voltra.View
          style={{
            width: box,
            height: box,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: '#0F172A',
            borderRadius: 4,
          }}
        >
          <Voltra.Text style={{ fontSize, fontWeight: '700', color: valueByMode }}>F</Voltra.Text>
        </Voltra.View>
      ),
      default: (
        <Voltra.View
          style={{
            width: box,
            height: box,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: '#FDF2F8',
            borderRadius: 4,
          }}
        >
          <Voltra.Text style={{ fontSize, fontWeight: '700', color: valueByMode }}>V</Voltra.Text>
        </Voltra.View>
      ),
    }}
  />
)

const BackgroundToggle = ({ box, fontSize }: { box: number; fontSize: number }) => (
  <Voltra.ControlIf
    condition={eq(env.showsWidgetContainerBackground, true)}
    else={
      <Voltra.View
        style={{
          width: box,
          height: box,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: labelByMode,
          borderRadius: 4,
        }}
      >
        <Voltra.Text style={{ fontSize, fontWeight: '700', color: valueByMode }}>N</Voltra.Text>
      </Voltra.View>
    }
  >
    <Voltra.View
      style={{
        width: box,
        height: box,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: valueByMode,
        borderRadius: 4,
      }}
    >
      <Voltra.Text style={{ fontSize, fontWeight: '700', color: valueByMode }}>Y</Voltra.Text>
    </Voltra.View>
  </Voltra.ControlIf>
)

/**
 * Lock screen · circular (~76×76 pt): ring frame, env label, mode strip, chrome row.
 */
export function ResolvableAccessoryCircular() {
  const modeBox = 15
  const chromeBox = 15
  const modeFont = 8
  const chromeFont = 8

  return (
    <Voltra.View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8
      }}
    >
<ModeSwitch box={modeBox} fontSize={modeFont} />
            <BackgroundToggle box={chromeBox} fontSize={chromeFont} />
        </Voltra.View>
  )
}

/**
 * Lock screen · rectangular (~172×76 pt): title row, divider, render + container rows.
 */
export function ResolvableAccessoryRectangular() {
  const modeBox = 20
  const chromeBox = 20
  const modeFont = 16

  return (
    <Voltra.View style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 4 }}>
    <Voltra.View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Voltra.Text style={{ fontSize: 20, fontWeight: '700', color: labelByMode }}>mode</Voltra.Text>
      <ModeSwitch box={modeBox} fontSize={modeFont} />
    </Voltra.View>
    <Voltra.View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Voltra.Text style={{ fontSize: 20, fontWeight: '700', color: labelByMode }}>bg</Voltra.Text>
      <BackgroundToggle box={chromeBox} fontSize={modeFont} />
    </Voltra.View>
  </Voltra.View>
  )
}

/**
 * Lock screen · inline (~172×40 pt): label block, rule, controls in one band.
 */
export function ResolvableAccessoryInline() {
  const modeBox = 14
  const chromeBox = 14
  const modeFont = 9

  return (
    <Voltra.View style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Voltra.View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Voltra.Text style={{ fontSize: 12, fontWeight: '700', color: labelByMode }}>mode</Voltra.Text>
        <ModeSwitch box={modeBox} fontSize={modeFont} />
      </Voltra.View>
      <Voltra.View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Voltra.Text style={{ fontSize: 12, fontWeight: '700', color: labelByMode }}>bg</Voltra.Text>
        <BackgroundToggle box={chromeBox} fontSize={modeFont} />
      </Voltra.View>
    </Voltra.View>
  )
}

const IosResolvablePlaygroundBody = ({ size }: { size: WidgetSize }) => {
  if (size === 'accessoryCircular') {
    return <ResolvableAccessoryCircular />
  }

  if (size === 'accessoryRectangular') {
    return <ResolvableAccessoryRectangular />
  }

  if (size === 'accessoryInline') {
    return <ResolvableAccessoryInline />
  }

  const compact = size === 'small'
  const box = compact ? 26 : 28
  const labelFont = compact ? 13 : 14

  return (
    <Voltra.View
      style={{
        flex: 1,
        padding: compact ? 14 : 18,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Voltra.View
        style={{
          flexDirection: 'column',
          gap: compact ? 10 : 12,
          alignItems: 'stretch',
        }}
      >
        <Voltra.Text
          style={{
            fontSize: compact ? 15 : 16,
            fontWeight: '700',
            color: valueByMode,
            textAlign: 'center',
          }}
        >
          Resolvable Values
        </Voltra.Text>

        <Row label="mode">
          <ModeSwitch box={box} fontSize={labelFont} />
        </Row>

        <Row label="background">
          <BackgroundToggle box={box} fontSize={labelFont} />
        </Row>
      </Voltra.View>
    </Voltra.View>
  )
}

export const IosResolvablePlaygroundWidget = ({ size = 'medium' }: { size?: WidgetSize }) => {
  return <IosResolvablePlaygroundBody size={size} />
}

export const resolvablePlaygroundVariants: WidgetVariants = {
  systemSmall: <IosResolvablePlaygroundBody size="small" />,
  systemMedium: <IosResolvablePlaygroundBody size="medium" />,
  systemLarge: <IosResolvablePlaygroundBody size="large" />,
  accessoryCircular: <ResolvableAccessoryCircular />,
  accessoryRectangular: <ResolvableAccessoryRectangular />,
  accessoryInline: <Voltra.Text>Ai</Voltra.Text>,
}
