import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { normalizeVoltraConfig, VoltraConfigNormalizationError } from './normalize.ts'

import type { AndroidWidgetConfig, IOSWidgetConfig } from './types.ts'

function normalizeWidgets(widgets: IOSWidgetConfig[]) {
  return normalizeVoltraConfig({
    config: { ios: { widgets } },
    configDir: process.cwd(),
  })
}

const streak: IOSWidgetConfig = { id: 'streak', displayName: 'Streak', description: 'Your daily streak' }
const weather: IOSWidgetConfig = { id: 'weather', displayName: 'Weather', description: 'Shows weather' }

describe('ios widget kind', () => {
  test('accepts a custom kind', () => {
    const config = normalizeWidgets([{ ...streak, kind: 'StreakWidget' }])

    assert.equal(config.ios?.widgets[0]?.kind, 'StreakWidget')
  })

  test('leaves the kind unset when the config does not pin one', () => {
    const config = normalizeWidgets([streak])

    assert.equal(config.ios?.widgets[0]?.kind, undefined)
  })

  test('rejects an empty kind', () => {
    assert.throws(
      () => normalizeWidgets([{ ...streak, kind: '' }]),
      (error: unknown) =>
        error instanceof VoltraConfigNormalizationError && /ios\.widgets\[streak\]\.kind/.test(error.message)
    )
  })

  test('rejects two widgets sharing a kind', () => {
    assert.throws(
      () =>
        normalizeWidgets([
          { ...streak, kind: 'Widgets' },
          { ...weather, kind: 'Widgets' },
        ]),
      (error: unknown) =>
        error instanceof VoltraConfigNormalizationError && /Duplicate ios widget kind 'Widgets'/.test(error.message)
    )
  })

  test('rejects a custom kind that collides with another widget default kind', () => {
    // `weather` would answer to `Voltra_Widget_weather` too, so both would fight over the same
    // placed instances.
    assert.throws(
      () => normalizeWidgets([{ ...streak, kind: 'Voltra_Widget_weather' }, weather]),
      (error: unknown) =>
        error instanceof VoltraConfigNormalizationError &&
        /Duplicate ios widget kind 'Voltra_Widget_weather'/.test(error.message)
    )
  })
})

describe('appIntent without an entry', () => {
  const parameters = [{ name: 'city', title: 'City', default: 'Seul' }]

  const androidWeather: AndroidWidgetConfig = {
    id: 'weather_widget',
    displayName: 'Weather Widget',
    description: 'Test Weather component',
    targetCellWidth: 3,
    targetCellHeight: 2,
  }

  function normalizeAndroidWidgets(widgets: AndroidWidgetConfig[]) {
    return normalizeVoltraConfig({
      config: { android: { widgets } },
      configDir: process.cwd(),
    })
  }

  test('warns that android appIntent needs an entry', () => {
    const config = normalizeAndroidWidgets([{ ...androidWeather, appIntent: { parameters } }])

    assert.match(config.warnings?.join('\n') ?? '', /android\.widgets\[weather_widget\]\.appIntent is ignored/)
    assert.match(config.warnings?.join('\n') ?? '', /'entry'/)
  })

  test('warns that ios appIntent needs an entry', () => {
    const config = normalizeWidgets([{ ...weather, appIntent: { parameters } }])

    assert.match(config.warnings?.join('\n') ?? '', /ios\.widgets\[weather\]\.appIntent is ignored/)
  })

  test('stays quiet when the widget has an entry', () => {
    const config = normalizeWidgets([{ ...weather, entry: './widgets/weather.tsx', appIntent: { parameters } }])

    assert.deepEqual(config.warnings, [])
  })

  test('stays quiet for an appIntent that declares no parameters', () => {
    const config = normalizeWidgets([{ ...weather, appIntent: { parameters: [] } }])

    assert.deepEqual(config.warnings, [])
  })
})
