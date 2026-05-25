const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')

const {
  VOLTRA_PAYLOAD_VERSION,
  createVoltraComponent,
  createVoltraRenderer,
  renderVariantToJson,
} = require('../build/cjs/index.js')

const View = createVoltraComponent('View')
const Text = createVoltraComponent('Text')

const componentIds = {
  View: 1,
  Text: 2,
}

const componentRegistry = {
  getComponentId(name) {
    const id = componentIds[name]

    if (id === undefined) {
      throw new Error(`Unknown component: ${name}`)
    }

    return id
  },
}

function renderRoots(entries) {
  const renderer = createVoltraRenderer(componentRegistry)

  for (const [name, node] of entries) {
    renderer.addRootNode(name, node)
  }

  return renderer.render()
}

test('renders stable payloads for equivalent trees and encodes props compactly', () => {
  const tree = React.createElement(
    View,
    {
      id: 'root',
      marginTop: 12,
      style: [{ padding: 8 }, null, { padding: 16, opacity: 0.5 }],
    },
    React.createElement(Text, null, 'Hello ', 42, false, null, undefined, 'world')
  )

  const first = renderRoots([['content', tree]])
  const second = renderRoots([['content', tree]])

  assert.deepStrictEqual(first, second)
  assert.deepStrictEqual(first, {
    v: VOLTRA_PAYLOAD_VERSION,
    content: {
      t: 1,
      i: 'root',
      c: { t: 2, c: 'Hello 42world' },
      p: { mt: 12, s: 0 },
    },
    s: [{ pad: 16, op: 0.5 }],
  })
})

test('supports fragments, function components, memo, forwardRef, lazy, and context', () => {
  const NameContext = React.createContext('fallback')

  function Greeting() {
    return React.createElement(NameContext.Consumer, null, (value) => React.createElement(Text, null, 'Hello ', value))
  }

  const MemoGreeting = React.memo(Greeting)
  const ForwardedGreeting = React.forwardRef(function ForwardedGreeting(_props, _ref) {
    return React.createElement(MemoGreeting)
  })
  const LazyGreeting = {
    $$typeof: Symbol.for('react.lazy'),
    _payload: ForwardedGreeting,
    _init: (payload) => payload,
  }

  const rendered = renderVariantToJson(
    React.createElement(
      NameContext.Provider,
      { value: 'Voltra' },
      React.createElement(
        React.Fragment,
        null,
        React.createElement(View, null, React.createElement(LazyGreeting)),
        React.createElement(
          NameContext.Provider,
          { value: 'Nested' },
          React.createElement(View, null, React.createElement(Greeting))
        )
      )
    ),
    componentRegistry
  )

  assert.deepStrictEqual(rendered, [
    { t: 1, c: { t: 2, c: 'Hello Voltra' } },
    { t: 1, c: { t: 2, c: 'Hello Nested' } },
  ])
})

test('deduplicates repeated element objects and reuses stylesheet entries', () => {
  const sharedChild = React.createElement(Text, { style: { color: 'red' } }, 'shared')
  const rendered = renderRoots([
    ['small', sharedChild],
    ['large', sharedChild],
  ])

  assert.deepStrictEqual(rendered, {
    v: VOLTRA_PAYLOAD_VERSION,
    small: { $r: 0 },
    large: { $r: 0 },
    e: [{ t: 2, c: 'shared', p: { s: 0 } }],
    s: [{ c: 'red' }],
  })
})

test('rejects raw text outside text components', () => {
  assert.throws(
    () => renderVariantToJson(React.createElement(View, null, 'nope'), componentRegistry),
    /Strings are only allowed as children of Text components/
  )
})

test('rejects unsupported host and class components', () => {
  class LegacyComponent extends React.Component {
    render() {
      return React.createElement(Text, null, 'legacy')
    }
  }

  assert.throws(() => renderVariantToJson(React.createElement('div'), componentRegistry), /Host component "div"/)
  assert.throws(
    () => renderVariantToJson(React.createElement(LegacyComponent), componentRegistry),
    /Class components are not supported/
  )
})

test('rejects strict mode, suspense, profiler, and portals with useful errors', () => {
  assert.throws(
    () =>
      renderVariantToJson(React.createElement(React.StrictMode, null, React.createElement(View)), componentRegistry),
    /Strict mode is not supported/
  )
  assert.throws(
    () =>
      renderVariantToJson(
        React.createElement(React.Suspense, { fallback: null }, React.createElement(View)),
        componentRegistry
      ),
    /Suspense is not supported/
  )
  assert.throws(
    () =>
      renderVariantToJson(
        React.createElement(React.Profiler, { id: 'profile', onRender() {} }, React.createElement(View)),
        componentRegistry
      ),
    /Profiler is not supported/
  )
  assert.throws(
    () => renderVariantToJson({ type: Symbol.for('react.portal'), props: {} }, componentRegistry),
    /Portal is not supported/
  )
})
