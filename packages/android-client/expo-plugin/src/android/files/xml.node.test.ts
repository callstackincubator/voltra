import { __test__ } from './xml'

describe('localeKeyToAndroidValuesQualifier', () => {
  it('maps plain language tags to classic Android qualifiers', () => {
    expect(__test__.localeKeyToAndroidValuesQualifier('pl')).toBe('pl')
  })

  it('maps language-region tags to classic Android qualifiers', () => {
    expect(__test__.localeKeyToAndroidValuesQualifier('pt-BR')).toBe('pt-rBR')
    expect(__test__.localeKeyToAndroidValuesQualifier('pt_BR')).toBe('pt-rBR')
  })

  it('maps script tags to Android BCP-47 qualifiers', () => {
    expect(__test__.localeKeyToAndroidValuesQualifier('zh-Hans')).toBe('b+zh+Hans')
    expect(__test__.localeKeyToAndroidValuesQualifier('zh-Hans-CN')).toBe('b+zh+Hans+CN')
    expect(__test__.localeKeyToAndroidValuesQualifier('sr-Latn-RS')).toBe('b+sr+Latn+RS')
  })
})

describe('generateWidgetInfoXml', () => {
  // The sizing attributes are interpolated into a `dedent` template on their own un-indented
  // line, so their literal padding has to survive dedent's indentation stripping. Assert the
  // whole document rather than the attribute list, so a reformat can't silently break it.
  it('emits every sizing attribute at the same indentation as the rest of the element', () => {
    expect(
      __test__.generateWidgetInfoXml({
        id: 'weather',
        displayName: 'Weather',
        description: 'Shows current weather conditions',
        targetCellWidth: 2,
        targetCellHeight: 2,
      })
    ).toBe(
      [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"',
        '    android:minWidth="130dp"',
        '    android:minHeight="117dp"',
        '    android:targetCellWidth="2"',
        '    android:targetCellHeight="2"',
        '    android:updatePeriodMillis="0"',
        '    android:initialLayout="@layout/voltra_widget_placeholder"',
        '    android:resizeMode="horizontal|vertical"',
        '    android:widgetCategory="home_screen"',
        '    android:description="@string/voltra_widget_weather_description">',
        '</appwidget-provider>',
      ].join('\n')
    )
  })

  it('emits the resize bound attributes at the same indentation, after targetCell', () => {
    expect(
      __test__.generateWidgetInfoXml({
        id: 'weather',
        displayName: 'Weather',
        description: 'Shows current weather conditions',
        targetCellWidth: 2,
        targetCellHeight: 2,
        minResizeWidth: 100,
        minResizeHeight: 90,
        maxResizeWidth: 300,
        maxResizeHeight: 250,
      })
    ).toBe(
      [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"',
        '    android:minWidth="130dp"',
        '    android:minHeight="117dp"',
        '    android:targetCellWidth="2"',
        '    android:targetCellHeight="2"',
        '    android:minResizeWidth="100dp"',
        '    android:minResizeHeight="90dp"',
        '    android:maxResizeWidth="300dp"',
        '    android:maxResizeHeight="250dp"',
        '    android:updatePeriodMillis="0"',
        '    android:initialLayout="@layout/voltra_widget_placeholder"',
        '    android:resizeMode="horizontal|vertical"',
        '    android:widgetCategory="home_screen"',
        '    android:description="@string/voltra_widget_weather_description">',
        '</appwidget-provider>',
      ].join('\n')
    )
  })
})
