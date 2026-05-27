import { Voltra, appIntentParam } from 'voltra'

// Track 2 PoC — demonstrates reactive widget rendering:
//   - appIntentParam('city'): user-configurable city name via iOS widget settings
//   - light-dark() colors: resolved to the device color scheme inside the extension
//
// The server renders this JSX to a compact JSON payload that includes the raw
// template expressions. At render time inside the widget extension, VoltraJSRenderer
// resolves them against the current device state — no server push required when
// the user reconfigures the widget or switches dark/light mode.

export const IosReactiveWeatherWidget = () => (
  <Voltra.VStack style={{ flex: 1, padding: 16, alignItems: 'flex-start' }}>
    <Voltra.Text
      style={{
        fontSize: 22,
        fontWeight: '700',
        color: 'light-dark(#111111, #eeeeee)',
      }}
    >
      {appIntentParam('city')}
    </Voltra.Text>
    <Voltra.Text
      style={{
        fontSize: 14,
        color: 'light-dark(#666666, #999999)',
        marginTop: 6,
      }}
    >
      Reactive Weather
    </Voltra.Text>
    <Voltra.Text
      style={{
        fontSize: 11,
        color: 'light-dark(#999999, #666666)',
        marginTop: 8,
      }}
    >
      Edit widget to set your city
    </Voltra.Text>
  </Voltra.VStack>
)