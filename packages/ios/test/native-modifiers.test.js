const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const React = require('react')

const {
  Voltra,
  renderLiveActivityToJson,
  renderVoltraVariantToJson,
  renderWidgetToJson,
} = require('../build/commonjs/index.js')

const FIXTURE_PATH = path.join(__dirname, '../../ios-client/ios/Tests/Fixtures/native-modifiers.json')

const { widgetURL, privacySensitive, clipShape } = Voltra.modifiers

/**
 * Representative calls for every factory. The Swift test decodes each one through the registry, so
 * a factory without a native implementation (or the other way round) fails CI.
 */
const SAMPLES = {
  widgetURL: [widgetURL('myapp://portfolio')],
  privacySensitive: [privacySensitive(), privacySensitive(false)],
  clipShape: [
    clipShape('circle'),
    clipShape('capsule', { cornerStyle: 'continuous' }),
    clipShape('roundedRectangle', { cornerRadius: 12, cornerStyle: 'continuous' }),
    clipShape('rectangle'),
    clipShape('ellipse'),
  ],
}

test('has a parity sample for every modifier factory', () => {
  assert.deepStrictEqual(Object.keys(SAMPLES).sort(), Object.keys(Voltra.modifiers).sort())
})

test('native modifier fixture matches the factories', () => {
  const expected = `${JSON.stringify(Object.values(SAMPLES).flat(), null, 2)}\n`
  if (process.env.UPDATE_MODIFIER_FIXTURES) {
    fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true })
    fs.writeFileSync(FIXTURE_PATH, expected)
  }
  assert.equal(
    fs.readFileSync(FIXTURE_PATH, 'utf8'),
    expected,
    'Run `UPDATE_MODIFIER_FIXTURES=1 pnpm --filter @use-voltra/ios test` after changing a modifier.'
  )
})

test('factories return frozen descriptors keyed by $type', () => {
  const modifier = clipShape('roundedRectangle', { cornerRadius: 12 })
  assert.deepStrictEqual(modifier, { $type: 'clipShape', shape: 'roundedRectangle', cornerRadius: 12 })
  assert.ok(Object.isFrozen(modifier))
})

test('Dynamic and payload renderers emit the same modifiers prop', () => {
  const tree = React.createElement(
    Voltra.VStack,
    { modifiers: [clipShape('circle'), widgetURL('myapp://portfolio')] },
    React.createElement(Voltra.Text, { modifiers: [privacySensitive()] }, 'Balance')
  )
  const expectedStack = JSON.stringify([clipShape('circle'), widgetURL('myapp://portfolio')])
  const expectedText = JSON.stringify([privacySensitive()])

  const dynamic = renderVoltraVariantToJson(tree)
  assert.equal(dynamic.p.mods, expectedStack)
  assert.equal(dynamic.c.p.mods, expectedText)

  const widget = renderWidgetToJson({ systemSmall: tree })
  assert.equal(widget.systemSmall.p.mods, expectedStack)

  const activity = renderLiveActivityToJson({ lockScreen: tree })
  assert.equal(activity.ls.p.mods, expectedStack)
})
