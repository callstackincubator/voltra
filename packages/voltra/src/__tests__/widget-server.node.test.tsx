import { createAndroidWidgetUpdateHandler, renderAndroidWidgetToString } from '@use-voltra/android-server'
import { serializeAndroidDynamicColorPalette } from '@use-voltra/android/internal'
import { createIOSWidgetUpdateHandler, renderWidgetToString, Voltra } from '@use-voltra/ios-server'
import { createWidgetUpdateHandler as createSharedWidgetUpdateHandler } from '@use-voltra/server'
import { VoltraAndroid, useAndroidDynamicColorPalette } from '../android/index.js'
import { createWidgetUpdateHandler as createCompatibilityWidgetUpdateHandler } from '../widget-server.js'

describe('server package split', () => {
  it('returns 400 when widgetId is missing', async () => {
    const handler = createSharedWidgetUpdateHandler({
      renderIos: async () => '{"ok":"ios"}',
    })

    const response = await handler(new Request('https://example.com/widgets?platform=ios'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Missing required query parameter: widgetId',
    })
  })

  it('returns 400 when platform is invalid', async () => {
    const handler = createSharedWidgetUpdateHandler({
      renderIos: async () => '{"ok":"ios"}',
    })

    const response = await handler(new Request('https://example.com/widgets?widgetId=clock&platform=web'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Missing or invalid required query parameter: platform',
    })
  })

  it('validates authorization tokens when configured', async () => {
    const handler = createSharedWidgetUpdateHandler({
      renderIos: async () => '{"ok":"ios"}',
      validateToken: (token) => token === 'valid-token',
    })

    const missingTokenResponse = await handler(new Request('https://example.com/widgets?widgetId=clock&platform=ios'))
    expect(missingTokenResponse.status).toBe(401)
    await expect(missingTokenResponse.json()).resolves.toEqual({
      error: 'Authorization required',
    })

    const invalidTokenResponse = await handler(
      new Request('https://example.com/widgets?widgetId=clock&platform=ios', {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      })
    )
    expect(invalidTokenResponse.status).toBe(401)
    await expect(invalidTokenResponse.json()).resolves.toEqual({
      error: 'Invalid token',
    })
  })

  it('supports iOS-only and Android-only shared handlers', async () => {
    const iosHandler = createSharedWidgetUpdateHandler({
      renderIos: async () => '{"platform":"ios"}',
    })
    const androidHandler = createSharedWidgetUpdateHandler({
      renderAndroid: async () => '{"platform":"android"}',
    })

    const iosResponse = await iosHandler(new Request('https://example.com/widgets?widgetId=clock&platform=ios'))
    const androidResponse = await androidHandler(
      new Request('https://example.com/widgets?widgetId=clock&platform=android')
    )
    const unsupportedResponse = await androidHandler(
      new Request('https://example.com/widgets?widgetId=clock&platform=ios')
    )

    expect(await iosResponse.text()).toBe('{"platform":"ios"}')
    expect(await androidResponse.text()).toBe('{"platform":"android"}')
    expect(unsupportedResponse.status).toBe(404)
    await expect(unsupportedResponse.json()).resolves.toEqual({
      error: 'No iOS render handler configured for widget: clock',
    })
  })

  it('supports dual-platform shared handlers', async () => {
    const handler = createSharedWidgetUpdateHandler({
      renderIos: async () => '{"platform":"ios"}',
      renderAndroid: async () => '{"platform":"android"}',
    })

    const iosResponse = await handler(new Request('https://example.com/widgets?widgetId=clock&platform=ios'))
    const androidResponse = await handler(new Request('https://example.com/widgets?widgetId=clock&platform=android'))

    expect(await iosResponse.text()).toBe('{"platform":"ios"}')
    expect(await androidResponse.text()).toBe('{"platform":"android"}')
  })

  it('includes the parsed URL on the render request', async () => {
    let renderUrl: string | undefined

    const handler = createSharedWidgetUpdateHandler({
      renderAndroid: async (request) => {
        renderUrl = request.url.toString()
        return '{"platform":"android"}'
      },
    })

    const response = await handler(
      new Request('https://example.com/widgets?widgetId=clock&platform=android&theme=dark')
    )

    expect(response.status).toBe(200)
    expect(renderUrl).toBe('https://example.com/widgets?widgetId=clock&platform=android&theme=dark')
  })

  it('serializes iOS widgets through the iOS server package adapter', async () => {
    const variants = {
      systemSmall: <Voltra.Text>Hello</Voltra.Text>,
    }
    const handler = createIOSWidgetUpdateHandler({
      render: async () => variants,
    })

    const response = await handler(new Request('https://example.com/widgets?widgetId=clock&platform=ios'))

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(renderWidgetToString(variants))
  })

  it('serializes Android widgets through the Android server package adapter', async () => {
    const variants = [
      {
        size: { width: 150, height: 100 },
        content: <VoltraAndroid.Text>Hello</VoltraAndroid.Text>,
      },
    ]
    const handler = createAndroidWidgetUpdateHandler({
      render: async () => variants,
    })

    const response = await handler(new Request('https://example.com/widgets?widgetId=clock&platform=android'))

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(renderAndroidWidgetToString(variants))
  })

  it('injects Android palette context into Android server handlers', async () => {
    const palette = {
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
    }
    const serializedPalette = serializeAndroidDynamicColorPalette(palette)

    const PaletteReader = () => {
      const dynamicColorPalette = useAndroidDynamicColorPalette()
      return <VoltraAndroid.Text>{dynamicColorPalette?.primary ?? 'missing'}</VoltraAndroid.Text>
    }

    const handler = createAndroidWidgetUpdateHandler({
      render: async () => [
        {
          size: { width: 150, height: 100 },
          content: <PaletteReader />,
        },
      ],
    })

    const response = await handler(
      new Request(
        `https://example.com/widgets?widgetId=clock&platform=android&androidPalette=${encodeURIComponent(
          serializedPalette!
        )}`
      )
    )

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(
      renderAndroidWidgetToString([
        {
          size: { width: 150, height: 100 },
          content: <VoltraAndroid.Text>#11223344</VoltraAndroid.Text>,
        },
      ])
    )
  })

  it('injects Android palette context into the root compatibility handler', async () => {
    const palette = {
      primary: '#55667788',
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
    }
    const serializedPalette = serializeAndroidDynamicColorPalette(palette)

    const PaletteReader = () => {
      const dynamicColorPalette = useAndroidDynamicColorPalette()
      return <VoltraAndroid.Text>{dynamicColorPalette?.primary ?? 'missing'}</VoltraAndroid.Text>
    }

    const handler = createCompatibilityWidgetUpdateHandler({
      renderIos: async () => null,
      renderAndroid: async () => [
        {
          size: { width: 150, height: 100 },
          content: <PaletteReader />,
        },
      ],
    })

    const response = await handler(
      new Request(
        `https://example.com/widgets?widgetId=clock&platform=android&androidPalette=${encodeURIComponent(
          serializedPalette!
        )}`
      )
    )

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(
      renderAndroidWidgetToString([
        {
          size: { width: 150, height: 100 },
          content: <VoltraAndroid.Text>#55667788</VoltraAndroid.Text>,
        },
      ])
    )
  })

  it('keeps the root compatibility handler API unchanged', async () => {
    const variants = {
      systemSmall: <Voltra.Text>Compat</Voltra.Text>,
    }
    const handler = createCompatibilityWidgetUpdateHandler({
      renderIos: async () => variants,
    })

    const response = await handler(new Request('https://example.com/widgets?widgetId=clock&platform=ios'))

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(renderWidgetToString(variants))
  })
})
