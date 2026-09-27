import { collectWidgetConfigurationStrings, validateWidgetConfigurationCopy } from './widgetConfiguration'

const widget = {
  id: 'Weather',
  configurationTitle: { en: 'Weather settings', pl: 'Ustawienia pogody' },
  appIntent: {
    parameters: [
      {
        name: 'units',
        title: { en: 'Units', pl: 'Jednostki' },
        default: 'metric',
        options: [
          { value: 'metric', title: { en: 'Metric', pl: 'Metryczne' } },
          { value: 'us-customary', title: 'US customary' },
        ],
      },
      { name: 'city', default: 'Warsaw' },
    ],
  },
}

describe('collectWidgetConfigurationStrings', () => {
  it('lists the sheet title, parameter titles and option labels under stable keys', () => {
    expect(collectWidgetConfigurationStrings(widget).map(({ key }) => key)).toEqual([
      'voltra_widget_Weather_intent_title',
      'voltra_widget_Weather_param_units_title',
      'voltra_widget_Weather_param_units_option_metric',
      'voltra_widget_Weather_param_units_option_us-customary',
    ])
  })

  it('sanitises every key segment with the given function', () => {
    const android = (value: string) => value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
    expect(collectWidgetConfigurationStrings(widget, android).map(({ key }) => key)).toContain(
      'voltra_widget_weather_param_units_option_us_customary'
    )
  })
})

describe('validateWidgetConfigurationCopy', () => {
  it('accepts locale-map titles and static options', () => {
    expect(() => validateWidgetConfigurationCopy(widget, { requireParameterTitle: false })).not.toThrow()
  })

  it('requires a title on iOS', () => {
    expect(() => validateWidgetConfigurationCopy(widget, { requireParameterTitle: true })).toThrow(
      "appIntent parameter 'city' needs a title"
    )
  })

  it('rejects a default that is not one of the options', () => {
    const invalid = {
      id: 'w',
      appIntent: {
        parameters: [{ name: 'units', title: 'Units', default: 'kelvin', options: [{ value: 'metric', title: 'M' }] }],
      },
    }
    expect(() => validateWidgetConfigurationCopy(invalid, { requireParameterTitle: true })).toThrow(
      "default 'kelvin' is not one of its options"
    )
  })

  it('rejects duplicate option values, invalid names and bad locale maps', () => {
    const base = { id: 'w' }
    expect(() =>
      validateWidgetConfigurationCopy(
        {
          ...base,
          appIntent: {
            parameters: [
              {
                name: 'units',
                title: 'Units',
                options: [
                  { value: 'a', title: 'A' },
                  { value: 'a', title: 'B' },
                ],
              },
            ],
          },
        },
        { requireParameterTitle: true }
      )
    ).toThrow("lists option 'a' twice")
    expect(() =>
      validateWidgetConfigurationCopy(
        { ...base, appIntent: { parameters: [{ name: 'my-param', title: 'x' }] } },
        { requireParameterTitle: true }
      )
    ).toThrow('.name must start with a letter')
    expect(() =>
      validateWidgetConfigurationCopy({ ...base, configurationTitle: {} }, { requireParameterTitle: true })
    ).toThrow('configurationTitle locale map must not be empty')
  })
})
