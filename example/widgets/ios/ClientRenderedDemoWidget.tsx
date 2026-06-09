import { Voltra, type WidgetEnvironment } from '@use-voltra/ios'

// Minimal client-rendered widget for verifying the dev loop.
//
// Plain black tile with the env values the runtime captured per render, plus a single
// editable literal (`hotReloadMarker` below) for proving hot reload end-to-end.
// Edit the literal, save, watch the home-screen widget update within ~1 second.

export const ClientRenderedDemoWidget = (_props: object, env: WidgetEnvironment = {} as WidgetEnvironment) => {
  'use voltra'

  // ▼ EDIT THIS LITERAL TO TEST HOT RELOAD ▼
  const hotReloadMarker = 'edit me 123'

  const date = env.date ? new Date(env.date) : new Date()
  const renderedAt = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const labelStyle = { fontSize: 9, color: '#FFFFFF' } as const
  const valueStyle = { fontSize: 9, color: '#94A3B8' } as const

  return (
    <Voltra.VStack alignment="leading" spacing={4} style={{ flex: 1, padding: 12, backgroundColor: '#000000' }}>
      <Voltra.Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>Client-rendered demo</Voltra.Text>

      <Voltra.Text style={{ fontSize: 14, fontWeight: '600', color: '#34D399' }}>{hotReloadMarker}</Voltra.Text>

      <Voltra.HStack spacing={4}>
        <Voltra.Text style={labelStyle}>family:</Voltra.Text>
        <Voltra.Text style={valueStyle}>{env.widgetFamily ?? '?'}</Voltra.Text>
      </Voltra.HStack>
      <Voltra.HStack spacing={4}>
        <Voltra.Text style={labelStyle}>scheme:</Voltra.Text>
        <Voltra.Text style={valueStyle}>{env.colorScheme ?? '?'}</Voltra.Text>
      </Voltra.HStack>
      <Voltra.HStack spacing={4}>
        <Voltra.Text style={labelStyle}>mode:</Voltra.Text>
        <Voltra.Text style={valueStyle}>{env.widgetRenderingMode ?? '?'}</Voltra.Text>
      </Voltra.HStack>
      <Voltra.HStack spacing={4}>
        <Voltra.Text style={labelStyle}>locale:</Voltra.Text>
        <Voltra.Text style={valueStyle}>{env.locale ?? '?'}</Voltra.Text>
      </Voltra.HStack>
      <Voltra.HStack spacing={4}>
        <Voltra.Text style={labelStyle}>dev:</Voltra.Text>
        <Voltra.Text style={valueStyle}>{String(env.build?.isDev ?? '?')}</Voltra.Text>
      </Voltra.HStack>
      <Voltra.HStack spacing={4}>
        <Voltra.Text style={labelStyle}>time:</Voltra.Text>
        <Voltra.Text style={valueStyle}>{renderedAt}</Voltra.Text>
      </Voltra.HStack>
    </Voltra.VStack>
  )
}
