import { createAndroidWidgetUpdateHandler, renderAndroidWidgetToString } from '@voltra/android-server'
import { createIOSWidgetUpdateHandler, renderWidgetToString, Voltra } from '@voltra/ios-server'
import { createWidgetUpdateHandler as createSharedWidgetUpdateHandler } from '@voltra/server'
import { VoltraAndroid } from '../android/index.js'
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
