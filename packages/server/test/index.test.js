const assert = require('node:assert/strict')
const test = require('node:test')

const {
  createWidgetUpdateExpressHandler,
  createWidgetUpdateHandler,
  createWidgetUpdateNodeHandler,
} = require('../build/cjs/index.js')

function createNodeResponseRecorder() {
  return {
    status: undefined,
    headers: undefined,
    body: undefined,
    writeHead(status, headers) {
      this.status = status
      this.headers = headers
    },
    end(body) {
      this.body = body
    },
  }
}

test('validates required query parameters', async () => {
  const handler = createWidgetUpdateHandler({})

  const missingWidgetId = await handler(new Request('https://example.com/update?platform=ios'))
  assert.equal(missingWidgetId.status, 400)
  assert.deepEqual(await missingWidgetId.json(), {
    error: 'Missing required query parameter: widgetId',
  })

  const missingPlatform = await handler(new Request('https://example.com/update?widgetId=weather'))
  assert.equal(missingPlatform.status, 400)
  assert.deepEqual(await missingPlatform.json(), {
    error: 'Missing or invalid required query parameter: platform',
  })

  const invalidPlatform = await handler(new Request('https://example.com/update?widgetId=weather&platform=web'))
  assert.equal(invalidPlatform.status, 400)
  assert.deepEqual(await invalidPlatform.json(), {
    error: 'Missing or invalid required query parameter: platform',
  })
})

test('enforces bearer token validation only when configured', async () => {
  const authCalls = []
  const handler = createWidgetUpdateHandler({
    renderIos: ({ token }) => JSON.stringify({ ok: true, token }),
    validateToken(token) {
      authCalls.push(token)
      return token === 'valid-token'
    },
  })

  const missingToken = await handler(new Request('https://example.com/update?widgetId=weather&platform=ios'))
  assert.equal(missingToken.status, 401)
  assert.deepEqual(await missingToken.json(), { error: 'Authorization required' })
  assert.deepEqual(authCalls, [])

  const invalidToken = await handler(
    new Request('https://example.com/update?widgetId=weather&platform=ios', {
      headers: { authorization: 'Bearer nope' },
    })
  )
  assert.equal(invalidToken.status, 401)
  assert.deepEqual(await invalidToken.json(), { error: 'Invalid token' })
  assert.deepEqual(authCalls, ['nope'])

  const validToken = await handler(
    new Request('https://example.com/update?widgetId=weather&platform=ios', {
      headers: { authorization: 'Bearer valid-token' },
    })
  )
  assert.equal(validToken.status, 200)
  assert.deepEqual(await validToken.json(), { ok: true, token: 'valid-token' })
  assert.deepEqual(authCalls, ['nope', 'valid-token'])

  const noAuthHandler = createWidgetUpdateHandler({
    renderIos: ({ token }) => JSON.stringify({ ok: true, token: token ?? null }),
  })
  const noAuthResponse = await noAuthHandler(new Request('https://example.com/update?widgetId=weather&platform=ios'))
  assert.equal(noAuthResponse.status, 200)
  assert.deepEqual(await noAuthResponse.json(), { ok: true, token: null })
})

test('parses request context and routes to platform renderers', async () => {
  const iosCalls = []
  const androidCalls = []
  const handler = createWidgetUpdateHandler({
    renderIos(request) {
      iosCalls.push(request)
      return JSON.stringify({ platform: request.platform, widgetId: request.widgetId })
    },
    renderAndroid(request) {
      androidCalls.push(request)
      return JSON.stringify({ platform: request.platform, widgetId: request.widgetId })
    },
  })

  const iosResponse = await handler(
    new Request('https://example.com/update?widgetId=weather&platform=ios&theme=dark&family=systemSmall', {
      headers: {
        authorization: 'Bearer ios-token',
        'x-voltra-request': 'ios',
      },
    })
  )
  assert.equal(iosResponse.status, 200)
  assert.deepEqual(await iosResponse.json(), { platform: 'ios', widgetId: 'weather' })
  assert.equal(iosCalls.length, 1)
  assert.equal(androidCalls.length, 0)
  assert.equal(iosCalls[0].widgetId, 'weather')
  assert.equal(iosCalls[0].platform, 'ios')
  assert.equal(iosCalls[0].theme, 'dark')
  assert.equal(iosCalls[0].family, 'systemSmall')
  assert.equal(iosCalls[0].token, 'ios-token')
  assert.equal(iosCalls[0].url.searchParams.get('widgetId'), 'weather')
  assert.equal(iosCalls[0].headers.authorization, 'Bearer ios-token')
  assert.equal(iosCalls[0].headers['x-voltra-request'], 'ios')

  const androidResponse = await handler(
    new Request('https://example.com/update?widgetId=weather&platform=android', {
      headers: { 'x-voltra-request': 'android' },
    })
  )
  assert.equal(androidResponse.status, 200)
  assert.deepEqual(await androidResponse.json(), { platform: 'android', widgetId: 'weather' })
  assert.equal(androidCalls.length, 1)
  assert.equal(androidCalls[0].theme, 'light')
  assert.equal(androidCalls[0].family, undefined)
  assert.equal(androidCalls[0].token, undefined)
  assert.equal(androidCalls[0].headers['x-voltra-request'], 'android')
})

test('returns stable 404 and 200 responses for renderer outcomes', async () => {
  const missingIosHandler = createWidgetUpdateHandler({ renderAndroid: () => '{"ok":true}' })
  const missingIosRenderer = await missingIosHandler(
    new Request('https://example.com/update?widgetId=weather&platform=ios')
  )
  assert.equal(missingIosRenderer.status, 404)
  assert.deepEqual(await missingIosRenderer.json(), {
    error: 'No iOS render handler configured for widget: weather',
  })

  const nullIosHandler = createWidgetUpdateHandler({ renderIos: () => null })
  const nullIosResponse = await nullIosHandler(new Request('https://example.com/update?widgetId=weather&platform=ios'))
  assert.equal(nullIosResponse.status, 404)
  assert.deepEqual(await nullIosResponse.json(), {
    error: 'No content for widget: weather',
  })

  const nullAndroidHandler = createWidgetUpdateHandler({ renderAndroid: () => null })
  const nullAndroidResponse = await nullAndroidHandler(
    new Request('https://example.com/update?widgetId=weather&platform=android')
  )
  assert.equal(nullAndroidResponse.status, 404)
  assert.deepEqual(await nullAndroidResponse.json(), {
    error: 'No content for Android widget: weather',
  })

  const successHandler = createWidgetUpdateHandler({ renderIos: () => '{"message":"ok"}' })
  const successResponse = await successHandler(new Request('https://example.com/update?widgetId=weather&platform=ios'))
  assert.equal(successResponse.status, 200)
  assert.equal(successResponse.headers.get('content-type'), 'application/json')
  assert.equal(successResponse.headers.get('cache-control'), 'no-cache')
  assert.equal(await successResponse.text(), '{"message":"ok"}')
})

test('returns a stable 500 response when renderers throw', async () => {
  const originalConsoleError = console.error
  console.error = () => {}

  try {
    const handler = createWidgetUpdateHandler({
      renderIos() {
        throw new Error('boom')
      },
    })

    const response = await handler(new Request('https://example.com/update?widgetId=weather&platform=ios'))
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { error: 'Internal server error' })
    assert.equal(response.headers.get('content-type'), 'application/json')
  } finally {
    console.error = originalConsoleError
  }
})

test('adapts Node and Express-style requests consistently', async () => {
  const calls = []
  const options = {
    renderAndroid(request) {
      calls.push(request)
      return JSON.stringify({
        widgetId: request.widgetId,
        platform: request.platform,
        theme: request.theme,
        family: request.family,
        token: request.token,
        url: request.url.toString(),
        headers: request.headers,
      })
    },
  }

  const nodeHandler = createWidgetUpdateNodeHandler(options)
  const nodeResponse = createNodeResponseRecorder()
  await nodeHandler(
    {
      url: '/update?widgetId=weather&platform=android&family=2x2',
      method: 'POST',
      headers: {
        host: 'widgets.example.com',
        authorization: 'Bearer node-token',
        'x-voltra-request': 'node',
        'x-many': ['one', 'two'],
      },
      socket: { encrypted: true },
    },
    nodeResponse
  )

  assert.equal(nodeResponse.status, 200)
  assert.deepEqual(nodeResponse.headers, {
    'cache-control': 'no-cache',
    'content-type': 'application/json',
  })
  assert.deepEqual(JSON.parse(nodeResponse.body), {
    widgetId: 'weather',
    platform: 'android',
    theme: 'light',
    family: '2x2',
    token: 'node-token',
    url: 'https://widgets.example.com/update?widgetId=weather&platform=android&family=2x2',
    headers: {
      authorization: 'Bearer node-token',
      host: 'widgets.example.com',
      'x-many': 'one, two',
      'x-voltra-request': 'node',
    },
  })

  const expressHandler = createWidgetUpdateExpressHandler(options)
  const expressResponse = createNodeResponseRecorder()
  await expressHandler(
    {
      url: '/update?widgetId=weather&platform=android',
      method: 'GET',
      headers: {
        host: 'widgets.example.com',
        'x-voltra-request': 'express',
      },
      socket: {},
    },
    expressResponse
  )

  assert.equal(expressResponse.status, 200)
  assert.deepEqual(JSON.parse(expressResponse.body), {
    widgetId: 'weather',
    platform: 'android',
    theme: 'light',
    url: 'http://widgets.example.com/update?widgetId=weather&platform=android',
    headers: {
      host: 'widgets.example.com',
      'x-voltra-request': 'express',
    },
  })

  assert.equal(calls.length, 2)
})
