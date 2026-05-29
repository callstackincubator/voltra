import { Voltra, appIntentParam } from 'voltra'

// Track 2 PoC — demonstrates AppIntent reactivity:
//   - appIntentParam('city'): user-configurable city name via iOS widget settings
//
// The server renders this JSX to a compact JSON payload that includes the raw
// template expressions. At render time inside the widget extension, VoltraJSRenderer
// resolves them against the current AppIntent parameters — no server push required
// when the user reconfigures the widget.

export const IosReactiveWeatherWidget = () => (
  <Voltra.VStack style={{ flex: 1, padding: 16, alignItems: 'flex-start' }}>
    <Voltra.Text
      style={{
        fontSize: 22,
        fontWeight: '700',
        color: 'primary',
      }}
    >
      {appIntentParam('city')}
    </Voltra.Text>
    <Voltra.Text
      style={{
        fontSize: 14,
        color: 'primary',
        marginTop: 6,
      }}
    >
      Reactive Weather
    </Voltra.Text>
    <Voltra.Text
      style={{
        fontSize: 11,
        color: 'primary',
        marginTop: 8,
      }}
    >
      Edit widget to set your city
    </Voltra.Text>
  </Voltra.VStack>
)