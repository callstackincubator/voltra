const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const React = require('react')

const {
  AndroidDynamicColors,
  VoltraAndroid,
  renderAndroidVariantToJson,
  renderAndroidWidgetToJson,
} = require('../build/commonjs/index.js')

const FIXTURE_PATH = path.join(__dirname, '../../android-client/android/src/test/resources/native-modifiers.json')

const {
  padding,
  absolutePadding,
  width,
  height,
  size,
  fillMaxWidth,
  fillMaxHeight,
  fillMaxSize,
  wrapContentWidth,
  wrapContentHeight,
  wrapContentSize,
  background,
  cornerRadius,
  visibility,
  semantics,
  appWidgetBackground,
} = VoltraAndroid.modifiers

/**
 * Representative calls for every factory. The Kotlin test decodes each one through the registry,
 * so a factory without a native implementation (or the other way round) fails CI.
 */
const SAMPLES = {
  padding: [
    padding(8),
    padding({ horizontal: 12, vertical: 4 }),
    padding({ all: 2, start: 6, top: 1, end: 3, bottom: 5 }),
  ],
  absolutePadding: [absolutePadding(4), absolutePadding({ left: 6, top: 1, right: 3, bottom: 5 })],
  width: [width(120)],
  height: [height(48)],
  size: [size(24), size({ width: 64, height: 32 })],
  fillMaxWidth: [fillMaxWidth()],
  fillMaxHeight: [fillMaxHeight()],
  fillMaxSize: [fillMaxSize()],
  wrapContentWidth: [wrapContentWidth()],
  wrapContentHeight: [wrapContentHeight()],
  wrapContentSize: [wrapContentSize()],
  background: [
    background('#101828'),
    background(AndroidDynamicColors.primaryContainer),
    background({ day: '#FFFFFF', night: '#000000' }),
  ],
  cornerRadius: [cornerRadius(12)],
  visibility: [visibility('visible'), visibility('invisible'), visibility('gone')],
  semantics: [
    semantics({ contentDescription: 'Portfolio' }),
    semantics({ contentDescription: 'Chart', testTag: 'chart' }),
  ],
  appWidgetBackground: [appWidgetBackground()],
}

test('has a parity sample for every modifier factory', () => {
  assert.deepStrictEqual(Object.keys(SAMPLES).sort(), Object.keys(VoltraAndroid.modifiers).sort())
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
    'Run `UPDATE_MODIFIER_FIXTURES=1 pnpm --filter @use-voltra/android test` after changing a modifier.'
  )
})

test('factories return frozen descriptors keyed by $type', () => {
  assert.deepStrictEqual(padding(8), { $type: 'padding', all: 8 })
  assert.ok(Object.isFrozen(padding(8)))
})

test('Dynamic and payload renderers emit the same modifiers prop', () => {
  const tree = React.createElement(
    VoltraAndroid.Box,
    { modifiers: [padding(8), cornerRadius(12)] },
    React.createElement(VoltraAndroid.Text, { modifiers: [visibility('gone')] }, 'Updating')
  )
  const expectedBox = JSON.stringify([padding(8), cornerRadius(12)])

  const dynamic = renderAndroidVariantToJson(tree)
  assert.equal(dynamic.p.mods, expectedBox)
  assert.equal(dynamic.c.p.mods, JSON.stringify([visibility('gone')]))

  const widget = renderAndroidWidgetToJson([{ size: { width: 150, height: 100 }, content: tree }])
  const [variant] = Object.values(widget.variants)
  assert.equal(variant.p.mods, expectedBox)
})
