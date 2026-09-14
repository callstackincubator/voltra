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

const m = Voltra.modifiers
const { widgetURL, privacySensitive, clipShape } = m

/**
 * Representative calls for every factory. The Swift test decodes each one through the registry, so
 * a factory without a native implementation (or the other way round) fails CI.
 */
const SAMPLES = {
  widgetURL: [widgetURL('myapp://portfolio')],
  containerBackground: [m.containerBackground('#101828')],
  widgetAccentable: [m.widgetAccentable(), m.widgetAccentable(false)],
  privacySensitive: [privacySensitive(), privacySensitive(false)],
  redacted: [m.redacted('placeholder'), m.redacted('privacy'), m.redacted('invalidated')],
  unredacted: [m.unredacted()],
  invalidatableContent: [m.invalidatableContent()],
  activityBackgroundTint: [m.activityBackgroundTint('rgba(16, 24, 40, 0.8)'), m.activityBackgroundTint(null)],
  activitySystemActionForegroundColor: [m.activitySystemActionForegroundColor('#FFFFFF')],
  contentTransition: [
    m.contentTransition('identity'),
    m.contentTransition('opacity'),
    m.contentTransition('interpolate'),
    m.contentTransition('numericText', { countsDown: true }),
    m.contentTransition('symbolEffect'),
  ],
  transition: [
    m.transition('identity'),
    m.transition('opacity'),
    m.transition('scale'),
    m.transition('slide'),
    m.transition('push', { edge: 'top' }),
    m.transition('move', { edge: 'leading' }),
  ],
  animation: [
    m.animation('default', { value: 42 }),
    m.animation('easeInOut', { value: 'price', duration: 0.5 }),
    m.animation('bouncy', { value: true }),
  ],
  symbolEffect: [
    m.symbolEffect('pulse'),
    m.symbolEffect('variableColor'),
    m.symbolEffect('breathe'),
    m.symbolEffect('rotate'),
    m.symbolEffect('wiggle'),
  ],
  clipShape: [
    clipShape('circle'),
    clipShape('capsule', { cornerStyle: 'continuous' }),
    clipShape('roundedRectangle', { cornerRadius: 12, cornerStyle: 'continuous' }),
    clipShape('rectangle'),
    clipShape('ellipse'),
  ],
  blur: [m.blur(4), m.blur(8, { opaque: true })],
  grayscale: [m.grayscale(1)],
  saturation: [m.saturation(0.5)],
  brightness: [m.brightness(0.1)],
  contrast: [m.contrast(1.2)],
  blendMode: [m.blendMode('multiply'), m.blendMode('plusLighter')],
  rotationEffect: [m.rotationEffect(-15)],
  scaleEffect: [m.scaleEffect(0.9), m.scaleEffect({ x: 1.2 })],
  offset: [m.offset({ x: 4, y: -2 })],
  fixedSize: [m.fixedSize(), m.fixedSize({ horizontal: false })],
  layoutPriority: [m.layoutPriority(1)],
  containerRelativeFrame: [m.containerRelativeFrame('horizontal'), m.containerRelativeFrame('both')],
  dynamicTypeSize: [m.dynamicTypeSize('xxLarge'), m.dynamicTypeSize('accessibility2')],
  minimumScaleFactor: [m.minimumScaleFactor(0.6)],
  truncationMode: [m.truncationMode('middle')],
  multilineTextAlignment: [m.multilineTextAlignment('center')],
  monospacedDigit: [m.monospacedDigit()],
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

test('a modifier-heavy pushed Live Activity stays within the payload budget', async () => {
  const { renderLiveActivityToString } = require('../build/commonjs/server.js')
  const row = (label) =>
    React.createElement(
      Voltra.HStack,
      {
        modifiers: [clipShape('roundedRectangle', { cornerRadius: 8, cornerStyle: 'continuous' }), privacySensitive()],
      },
      React.createElement(Voltra.Text, { modifiers: [privacySensitive()] }, label)
    )
  const tree = React.createElement(
    Voltra.VStack,
    { modifiers: [widgetURL('myapp://portfolio'), clipShape('capsule')] },
    ...Array.from({ length: 12 }, (_, index) => row(`Row ${index}`))
  )

  const plain = await renderLiveActivityToString({ lockScreen: React.createElement(Voltra.VStack, null, row('Row')) })
  const heavy = await renderLiveActivityToString({ lockScreen: tree })

  // Record the cost so a change in encoding shows up in review; the budget check itself throws.
  assert.ok(heavy.length > plain.length)
  assert.ok(heavy.length < 1000, `modifier-heavy payload grew to ${heavy.length} base64 bytes`)
})
