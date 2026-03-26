import React from 'react'
import { NativeModules } from 'react-native'

import { AndroidWidgetRenderContextProvider } from '@use-voltra/android/internal'
import { createAndroidWidgetRenderContext } from '@use-voltra/android/server'
import { VoltraAndroid, useAndroidDynamicColorPalette } from '../android/index.js'
import { renderAndroidWidgetToJson } from '../android/widgets/renderer.js'
import { renderAndroidVariantToJson } from '../renderer/renderer.js'

describe('Android dynamic color hook', () => {
  beforeEach(() => {
    delete (globalThis as { expo?: unknown }).expo
    delete NativeModules.VoltraModule
  })

  it('reads the provider palette during synchronous render', () => {
    const Component = () => {
      const palette = useAndroidDynamicColorPalette()
      return <VoltraAndroid.Text>{palette?.primary ?? 'missing'}</VoltraAndroid.Text>
    }

    const output = renderAndroidVariantToJson(
      <AndroidWidgetRenderContextProvider
        value={{
          theme: 'dark',
          dynamicColorPalette: {
            primary: '#11223344',
            onPrimary: '#111111ff',
            primaryContainer: '#111111ff',
            onPrimaryContainer: '#111111ff',
            secondary: '#111111ff',
            onSecondary: '#111111ff',
            secondaryContainer: '#111111ff',
            onSecondaryContainer: '#111111ff',
            tertiary: '#111111ff',
            onTertiary: '#111111ff',
            tertiaryContainer: '#111111ff',
            onTertiaryContainer: '#111111ff',
            error: '#111111ff',
            errorContainer: '#111111ff',
            onError: '#111111ff',
            onErrorContainer: '#111111ff',
            background: '#111111ff',
            onBackground: '#111111ff',
            surface: '#111111ff',
            onSurface: '#111111ff',
            surfaceVariant: '#111111ff',
            onSurfaceVariant: '#111111ff',
            outline: '#111111ff',
            inverseOnSurface: '#111111ff',
            inverseSurface: '#111111ff',
            inversePrimary: '#111111ff',
            widgetBackground: '#111111ff',
          },
        }}
      >
        <Component />
      </AndroidWidgetRenderContextProvider>
    ) as { c?: string }

    expect(output.c).toBe('#11223344')
  })

  it('reads the automatically injected widget render context', () => {
    const Component = () => {
      const palette = useAndroidDynamicColorPalette()
      return <VoltraAndroid.Text>{palette === null ? 'missing' : 'present'}</VoltraAndroid.Text>
    }

    const output = renderAndroidWidgetToJson([
      {
        size: { width: 150, height: 100 },
        content: <Component />,
      },
    ]) as { variants?: Record<string, { c?: string }> }

    expect(output.variants?.['150x100']?.c).toBe('missing')
  })

  it('throws when no provider is present', () => {
    const getAndroidDynamicColorPalette = jest.fn(() => Array.from({ length: 27 }, () => '#aabbccdd'))

    NativeModules.VoltraModule = {
      getAndroidDynamicColorPalette,
    }

    const Component = () => {
      useAndroidDynamicColorPalette()
      return <VoltraAndroid.Text>unreachable</VoltraAndroid.Text>
    }

    expect(() => renderAndroidVariantToJson(<Component />)).toThrow(
      'This is an internal problem in Voltra. Please report the issue.'
    )
    expect(getAndroidDynamicColorPalette).not.toHaveBeenCalled()
  })

  it('parses server query parameters into render context', () => {
    const renderContext = createAndroidWidgetRenderContext({
      theme: 'light',
      url: new URL(
        'https://example.com/widgets?androidPalette=%5B%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%2C%22%2311223344%22%5D'
      ),
    })

    expect(renderContext.theme).toBe('light')
    expect(renderContext.dynamicColorPalette?.primary).toBe('#11223344')
    expect(renderContext.dynamicColorPalette?.widgetBackground).toBe('#11223344')
  })
})
