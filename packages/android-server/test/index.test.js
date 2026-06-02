const assert = require('node:assert/strict')
const test = require('node:test')

const React = require('react')

const {
  createAndroidWidgetUpdateExpressHandler,
  createAndroidWidgetUpdateHandler,
  createAndroidWidgetUpdateNodeHandler,
  renderAndroidWidgetToString,
} = require('../build/cjs/index.js')
const { VoltraAndroid } = require('../../android/build/commonjs/index.js')

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

function createWidgetVariants(label) {
  return [
    {
      size: { width: 150, height: 80 },
      content: React.createElement(VoltraAndroid.Box, null, React.createElement(VoltraAndroid.Text, null, label)),
    },
  ]
}

test('serializes Android widget variants before returning the shared response', async () => {
  const variants = createWidgetVariants('Hello from Android')
  const calls = []
  const handler = createAndroidWidgetUpdateHandler({
    render(request) {
      calls.push(request)
      return variants
    },
  })

  const response = await handler(
    new Request('https://example.com/update?widgetId=weather&platform=android&theme=dark', {
      headers: {
        authorization: 'Bearer android-token',
        'x-voltra-request': 'android-fetch',
      },
    })
  )

  assert.equal(response.status, 200)
  assert.equal(await response.text(), renderAndroidWidgetToString(variants))
  assert.equal(calls.length, 1)
  assert.equal(calls[0].widgetId, 'weather')
  assert.equal(calls[0].platform, 'android')
  assert.equal(calls[0].theme, 'dark')
  assert.equal(calls[0].family, undefined)
  assert.equal(calls[0].token, 'android-token')
  assert.equal(calls[0].headers.authorization, 'Bearer android-token')
  assert.equal(calls[0].headers['x-voltra-request'], 'android-fetch')
})

test('passes validateToken through unchanged and preserves null render results', async () => {
  const authCalls = []
  const handler = createAndroidWidgetUpdateHandler({
    render() {
      return null
    },
    validateToken(token) {
      authCalls.push(token)
      return token === 'valid-token'
    },
  })

  const missingToken = await handler(new Request('https://example.com/update?widgetId=weather&platform=android'))
  assert.equal(missingToken.status, 401)
  assert.deepEqual(await missingToken.json(), { error: 'Authorization required' })
  assert.deepEqual(authCalls, [])

  const invalidToken = await handler(
    new Request('https://example.com/update?widgetId=weather&platform=android', {
      headers: { authorization: 'Bearer nope' },
    })
  )
  assert.equal(invalidToken.status, 401)
  assert.deepEqual(await invalidToken.json(), { error: 'Invalid token' })

  const validToken = await handler(
    new Request('https://example.com/update?widgetId=weather&platform=android', {
      headers: { authorization: 'Bearer valid-token' },
    })
  )
  assert.equal(validToken.status, 404)
  assert.deepEqual(await validToken.json(), { error: 'No content for Android widget: weather' })
  assert.deepEqual(authCalls, ['nope', 'valid-token'])
})

test('Node and Express adapters delegate through the same conversion path', async () => {
  const variants = createWidgetVariants('Hello from adapter')
  const calls = []
  const options = {
    render(request) {
      calls.push({
        widgetId: request.widgetId,
        platform: request.platform,
        theme: request.theme,
        family: request.family,
        token: request.token,
        url: request.url.toString(),
        headers: request.headers,
      })
      return variants
    },
  }

  const nodeHandler = createAndroidWidgetUpdateNodeHandler(options)
  const nodeResponse = createNodeResponseRecorder()
  await nodeHandler(
    {
      url: '/update?widgetId=weather&platform=android',
      method: 'POST',
      headers: {
        host: 'widgets.example.com',
        authorization: 'Bearer node-token',
        'x-voltra-request': 'node',
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
  assert.equal(nodeResponse.body, renderAndroidWidgetToString(variants))

  const expressHandler = createAndroidWidgetUpdateExpressHandler(options)
  const expressResponse = createNodeResponseRecorder()
  await expressHandler(
    {
      url: '/update?widgetId=weather&platform=android&theme=dark',
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
  assert.deepEqual(expressResponse.headers, {
    'cache-control': 'no-cache',
    'content-type': 'application/json',
  })
  assert.equal(expressResponse.body, renderAndroidWidgetToString(variants))

  assert.deepEqual(calls, [
    {
      widgetId: 'weather',
      platform: 'android',
      theme: 'light',
      family: undefined,
      token: 'node-token',
      url: 'https://widgets.example.com/update?widgetId=weather&platform=android',
      headers: {
        authorization: 'Bearer node-token',
        host: 'widgets.example.com',
        'x-voltra-request': 'node',
      },
    },
    {
      widgetId: 'weather',
      platform: 'android',
      theme: 'dark',
      family: undefined,
      token: undefined,
      url: 'http://widgets.example.com/update?widgetId=weather&platform=android&theme=dark',
      headers: {
        host: 'widgets.example.com',
        'x-voltra-request': 'express',
      },
    },
  ])
})
