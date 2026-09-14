const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')

const { createVoltraComponent, createVoltraRenderer, renderVariantToJson } = require('../build/cjs/index.js')

const View = createVoltraComponent('View')
const Text = createVoltraComponent('Text')

const componentRegistry = {
  getComponentId(name) {
    return { View: 1, Text: 2 }[name]
  },
}

const padding = { $type: 'padding', all: 8 }
const widgetURL = { $type: 'widgetURL', url: 'myapp://portfolio' }

test('encodes modifiers as an ordered JSON string next to style', () => {
  const rendered = renderVariantToJson(
    React.createElement(View, { style: { padding: 4 }, modifiers: [padding, widgetURL] }),
    componentRegistry
  )

  assert.deepStrictEqual(rendered, {
    t: 1,
    p: { s: { pad: 4 }, mods: JSON.stringify([padding, widgetURL]) },
  })
})

test('treats false and falsy entries as no modifier', () => {
  assert.deepStrictEqual(renderVariantToJson(React.createElement(View, { modifiers: false }), componentRegistry), {
    t: 1,
  })
  assert.deepStrictEqual(
    renderVariantToJson(React.createElement(View, { modifiers: [false, padding, null, undefined] }), componentRegistry),
    { t: 1, p: { mods: JSON.stringify([padding]) } }
  )
  assert.deepStrictEqual(renderVariantToJson(React.createElement(View, { modifiers: [false] }), componentRegistry), {
    t: 1,
  })
})

test('omits empty and missing modifier lists', () => {
  assert.deepStrictEqual(renderVariantToJson(React.createElement(View, { modifiers: [] }), componentRegistry), { t: 1 })
  assert.deepStrictEqual(renderVariantToJson(React.createElement(View, { modifiers: undefined }), componentRegistry), {
    t: 1,
  })
})

test('encodes modifiers the same way in the multi-root renderer', () => {
  const renderer = createVoltraRenderer(componentRegistry)
  renderer.addRootNode('small', React.createElement(Text, { modifiers: [widgetURL] }, 'Hi'))
  renderer.addRootNode('large', React.createElement(View, { style: { padding: 4 }, modifiers: [padding] }))

  const rendered = renderer.render()

  assert.deepStrictEqual(rendered.small, { t: 2, c: 'Hi', p: { mods: JSON.stringify([widgetURL]) } })
  assert.deepStrictEqual(rendered.large, { t: 1, p: { s: 0, mods: JSON.stringify([padding]) } })
})

test('rejects modifier values that were not created by a factory', () => {
  assert.throws(
    () => renderVariantToJson(React.createElement(View, { modifiers: padding }), componentRegistry),
    /must be an array/
  )
  assert.throws(
    () => renderVariantToJson(React.createElement(View, { modifiers: [{ all: 8 }] }), componentRegistry),
    /only accepts values created by/
  )
})
