import { Voltra, appIntentParam } from 'voltra'

export const IosCodegenTemperatureWidget = () => (
  <Voltra.VStack style={{ flex: 1, padding: 16, alignItems: 'flex-start' }}>
    <Voltra.Text style={{ fontSize: 22, fontWeight: '700', color: 'light-dark(#111111, #eeeeee)' }}>
      {appIntentParam('temperature')}
    </Voltra.Text>
    <Voltra.Text style={{ fontSize: 14, color: 'light-dark(#666666, #999999)', marginTop: 6 }}>
      Temperature
    </Voltra.Text>
  </Voltra.VStack>
)