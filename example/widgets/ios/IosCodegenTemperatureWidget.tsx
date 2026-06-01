import { Voltra, appIntentParam } from '@use-voltra/ios'

export const IosCodegenTemperatureWidget = () => (
  <Voltra.VStack style={{ flex: 1, padding: 16, alignItems: 'flex-start' }}>
    <Voltra.Text style={{ fontSize: 22, fontWeight: '700', color: 'primary' }}>
      {appIntentParam('temperature')}
    </Voltra.Text>
    <Voltra.Text style={{ fontSize: 14, color: 'primary', marginTop: 6 }}>Temperature</Voltra.Text>
  </Voltra.VStack>
)
