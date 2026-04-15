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

const CompactRow = ({
  label,
  labelWidth,
  labelFontSize,
  gap,
  childGap,
  children,
}: {
  label: string
  labelWidth: number
  labelFontSize: number
  gap: number
  childGap: number
  children: React.ReactNode
}) => (
  <Voltra.View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
    <Voltra.Text
      style={{
        width: labelWidth,
        fontSize: labelFontSize,
        fontWeight: '600',
        color: labelByMode,
      }}
    >
      {label}
    </Voltra.Text>
    <Voltra.View style={{ flexDirection: 'row', alignItems: 'center', gap: childGap }}>{children}</Voltra.View>
  </Voltra.View>
)

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

const IosResolvablePlaygroundBody = ({ size }: { size: WidgetSize }) => {
  if (size === 'accessoryCircular') {
    const box = 18
    const fontSize = 9
    return (
      <Voltra.View
        style={{
          flex: 1,
          padding: 6,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Voltra.View style={{ flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <Voltra.Text style={{ fontSize: 9, fontWeight: '700', color: valueByMode }}>RV</Voltra.Text>
          <ModeSwitch box={box} fontSize={fontSize} />
          <BackgroundToggle box={box} fontSize={fontSize} />
        </Voltra.View>
      </Voltra.View>
    )
  }

  if (size === 'accessoryRectangular') {
    const box = 22
    const fontSize = 10
    return (
      <Voltra.View style={{ flex: 1, padding: 8, justifyContent: 'center' }}>
        <Voltra.View style={{ flexDirection: 'column', gap: 6, alignItems: 'stretch' }}>
          <Voltra.Text style={{ fontSize: 11, fontWeight: '700', color: valueByMode, textAlign: 'center' }}>
            Resolvable
          </Voltra.Text>
          <CompactRow label="mode" labelWidth={36} labelFontSize={10} gap={6} childGap={4}>
            <ModeSwitch box={box} fontSize={fontSize} />
          </CompactRow>
          <CompactRow label="bg" labelWidth={36} labelFontSize={10} gap={6} childGap={4}>
            <BackgroundToggle box={box} fontSize={fontSize} />
          </CompactRow>
        </Voltra.View>
      </Voltra.View>
    )
  }

  if (size === 'accessoryInline') {
    const box = 20
    const fontSize = 10
    return (
      <Voltra.View
        style={{
          flex: 1,
          paddingHorizontal: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Voltra.Text style={{ fontSize: 11, fontWeight: '700', color: valueByMode }}>RV</Voltra.Text>
        <ModeSwitch box={box} fontSize={fontSize} />
        <BackgroundToggle box={box} fontSize={fontSize} />
      </Voltra.View>
    )
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
  systemSmall: <IosResolvablePlaygroundWidget size="small" />,
  systemMedium: <IosResolvablePlaygroundWidget size="medium" />,
  systemLarge: <IosResolvablePlaygroundWidget size="medium" />,
  accessoryCircular: <IosResolvablePlaygroundWidget size="accessoryCircular" />,
  accessoryRectangular: <IosResolvablePlaygroundWidget size="accessoryRectangular" />,
  accessoryInline: <IosResolvablePlaygroundWidget size="accessoryInline" />,
}
