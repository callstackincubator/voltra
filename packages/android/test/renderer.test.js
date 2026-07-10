const assert = require('node:assert/strict')
const test = require('node:test')
const React = require('react')

const android = require('../build/commonjs/index.js')
const { validateAndroidLayoutChildLimit } = require('../build/commonjs/internal.js')
const { createVoltraComponent } = require('../build/commonjs/jsx/createVoltraComponent.js')

const {
  ANDROID_COMPONENT_NAME_TO_ID,
  VoltraAndroid,
  getAndroidComponentId,
  renderAndroidLiveUpdateToJson,
  renderAndroidLiveUpdateToString,
  renderAndroidVariantToJson,
  renderAndroidViewToJson,
  renderAndroidWidgetToJson,
  renderAndroidWidgetToString,
} = android

test('renders Android widget variants under the expected size keys', () => {
  const variants = [
    {
      size: { width: 150, height: 100 },
      content: React.createElement(VoltraAndroid.Text, null, 'Small'),
    },
    {
      size: { width: 215, height: 100 },
      content: React.createElement(
        VoltraAndroid.Box,
        { testID: 'wide-root' },
        React.createElement(VoltraAndroid.Text, null, 'Wide')
      ),
    },
    {
      size: { width: 150, height: 200 },
      content: null,
    },
  ]

  assert.deepEqual(renderAndroidWidgetToJson(variants), {
    v: 1,
    variants: {
      '150x100': {
        t: getAndroidComponentId('AndroidText'),
        c: 'Small',
      },
      '215x100': {
        t: getAndroidComponentId('AndroidBox'),
        c: {
          t: getAndroidComponentId('AndroidText'),
          c: 'Wide',
        },
        p: {
          testID: 'wide-root',
        },
      },
      '150x200': [],
    },
  })
})

test('keeps Android widget string output aligned with JSON output', () => {
  const variants = [
    {
      size: { width: 150, height: 100 },
      content: React.createElement(VoltraAndroid.Text, null, 'Small'),
    },
  ]

  assert.equal(renderAndroidWidgetToString(variants), JSON.stringify(renderAndroidWidgetToJson(variants)))
})

test('renders Android view payloads with metadata separate from variants', () => {
  assert.deepEqual(
    renderAndroidViewToJson(
      React.createElement(VoltraAndroid.Column, null, React.createElement(VoltraAndroid.Text, null, 'View content'))
    ),
    {
      v: 1,
      variants: {
        content: {
          t: getAndroidComponentId('AndroidColumn'),
          c: {
            t: getAndroidComponentId('AndroidText'),
            c: 'View content',
          },
        },
      },
    }
  )
})

test('renders LazyVerticalGrid children with fixed columns and horizontal alignment', () => {
  const letters = ['A', 'B', 'C']

  assert.deepEqual(
    renderAndroidViewToJson(
      React.createElement(
        VoltraAndroid.LazyVerticalGrid,
        {
          columns: 3,
          horizontalAlignment: 'center-horizontally',
        },
        letters.map((letter) => React.createElement(VoltraAndroid.Text, { key: letter }, letter))
      )
    ),
    {
      v: 1,
      variants: {
        content: {
          t: getAndroidComponentId('AndroidLazyVerticalGrid'),
          c: letters.map((letter) => ({
            t: getAndroidComponentId('AndroidText'),
            c: letter,
          })),
          p: {
            cols: 3,
            halig: 'center-horizontally',
          },
        },
      },
    }
  )
})

test('renders LazyVerticalGrid fixed column objects as fixed column counts', () => {
  assert.deepEqual(
    renderAndroidViewToJson(
      React.createElement(
        VoltraAndroid.LazyVerticalGrid,
        {
          columns: { type: 'fixed', count: 4 },
        },
        React.createElement(VoltraAndroid.Text, null, 'A')
      )
    ),
    {
      v: 1,
      variants: {
        content: {
          t: getAndroidComponentId('AndroidLazyVerticalGrid'),
          c: {
            t: getAndroidComponentId('AndroidText'),
            c: 'A',
          },
          p: {
            cols: 4,
          },
        },
      },
    }
  )
})

test('renders LazyVerticalGrid adaptive columns as compact grid cell config', () => {
  assert.deepEqual(
    renderAndroidViewToJson(
      React.createElement(
        VoltraAndroid.LazyVerticalGrid,
        {
          columns: { type: 'adaptive', minSize: 96 },
        },
        React.createElement(VoltraAndroid.Text, null, 'A')
      )
    ),
    {
      v: 1,
      variants: {
        content: {
          t: getAndroidComponentId('AndroidLazyVerticalGrid'),
          c: {
            t: getAndroidComponentId('AndroidText'),
            c: 'A',
          },
          p: {
            cols: 'a:96',
          },
        },
      },
    }
  )
})

test('renders Android live update roots and metadata into the expected fields', () => {
  const liveUpdate = {
    collapsed: React.createElement(VoltraAndroid.Text, null, 'Collapsed'),
    expanded: React.createElement(VoltraAndroid.Box, null, React.createElement(VoltraAndroid.Text, null, 'Expanded')),
    smallIcon: 'icon.png',
    channelId: 'updates',
  }

  assert.deepEqual(renderAndroidLiveUpdateToJson(liveUpdate), {
    v: 1,
    collapsed: {
      t: getAndroidComponentId('AndroidText'),
      c: 'Collapsed',
    },
    expanded: {
      t: getAndroidComponentId('AndroidBox'),
      c: {
        t: getAndroidComponentId('AndroidText'),
        c: 'Expanded',
      },
    },
    smallIcon: 'icon.png',
    channelId: 'updates',
  })

  assert.equal(renderAndroidLiveUpdateToString(liveUpdate), JSON.stringify(renderAndroidLiveUpdateToJson(liveUpdate)))
  assert.deepEqual(renderAndroidLiveUpdateToJson({}), { v: 1 })
})

test('uses generated Android component ids consistently in rendered payloads', () => {
  assert.equal(ANDROID_COMPONENT_NAME_TO_ID.AndroidText, getAndroidComponentId('AndroidText'))
  assert.equal(ANDROID_COMPONENT_NAME_TO_ID.AndroidBox, getAndroidComponentId('AndroidBox'))

  const widgetJson = renderAndroidWidgetToJson([
    {
      size: { width: 100, height: 100 },
      content: React.createElement(VoltraAndroid.Box, null, React.createElement(VoltraAndroid.Text, null, 'Hello')),
    },
  ])

  assert.deepEqual(widgetJson.variants['100x100'], {
    t: getAndroidComponentId('AndroidBox'),
    c: {
      t: getAndroidComponentId('AndroidText'),
      c: 'Hello',
    },
  })
})

test('fails loudly for unknown Android component names', () => {
  const Unknown = createVoltraComponent('UnknownAndroidWidget')

  assert.throws(
    () =>
      renderAndroidWidgetToJson([
        {
          size: { width: 100, height: 100 },
          content: React.createElement(Unknown, null),
        },
      ]),
    {
      message: /Unknown Android component name: "UnknownAndroidWidget"/,
    }
  )
})

function withDevelopmentWarnings(run) {
  const previousNodeEnv = process.env.NODE_ENV
  const previousWarn = console.warn
  const warnings = []

  process.env.NODE_ENV = 'development'
  console.warn = (message) => warnings.push(message)

  try {
    run(warnings)
  } finally {
    console.warn = previousWarn
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = previousNodeEnv
    }
  }
}

function createLayoutChildren(count) {
  return Array.from({ length: count }, (_, index) =>
    React.createElement(VoltraAndroid.Text, { key: index }, String(index))
  )
}

test('warns when an Android Column has more than 10 direct rendered children in development', () => {
  withDevelopmentWarnings((warnings) => {
    renderAndroidViewToJson(React.createElement(VoltraAndroid.Column, null, createLayoutChildren(11)))

    assert.equal(warnings.length, 1)
    assert.match(warnings[0], /AndroidColumn/)
    assert.match(warnings[0], /11 direct children/)
    assert.match(warnings[0], /10-child limit/)
    assert.match(warnings[0], /LazyColumn/)
  })
})

test('warns when an Android Row has more than 10 direct rendered children in development', () => {
  withDevelopmentWarnings((warnings) => {
    renderAndroidWidgetToJson([
      {
        size: { width: 100, height: 100 },
        content: React.createElement(VoltraAndroid.Row, null, createLayoutChildren(11)),
      },
    ])

    assert.equal(warnings.length, 1)
    assert.match(warnings[0], /AndroidRow/)
    assert.match(warnings[0], /11 direct children/)
  })
})

test('checks nested Android Columns independently', () => {
  withDevelopmentWarnings((warnings) => {
    renderAndroidViewToJson(
      React.createElement(
        VoltraAndroid.Column,
        null,
        React.createElement(VoltraAndroid.Column, null, createLayoutChildren(11))
      )
    )

    assert.equal(warnings.length, 1)
    assert.match(warnings[0], /11 direct children/)
  })
})

test('does not warn for Android LazyColumn children', () => {
  withDevelopmentWarnings((warnings) => {
    renderAndroidViewToJson(React.createElement(VoltraAndroid.LazyColumn, null, createLayoutChildren(11)))

    assert.deepEqual(warnings, [])
  })
})

test('counts shared-element references as their resolved direct children once', () => {
  withDevelopmentWarnings((warnings) => {
    validateAndroidLayoutChildLimit({
      variants: {
        content: {
          t: getAndroidComponentId('AndroidColumn'),
          c: { $r: 0 },
        },
      },
      e: [createLayoutChildren(11).map((child) => renderAndroidVariantToJson(child))],
    })

    assert.equal(warnings.length, 1)
    assert.match(warnings[0], /11 direct children/)
  })
})

test('does not warn in production or test environments', () => {
  const previousNodeEnv = process.env.NODE_ENV
  const previousWarn = console.warn
  const warnings = []

  console.warn = (message) => warnings.push(message)

  try {
    for (const environment of ['production', 'test']) {
      process.env.NODE_ENV = environment
      renderAndroidViewToJson(React.createElement(VoltraAndroid.Column, null, createLayoutChildren(11)))
    }

    assert.deepEqual(warnings, [])
  } finally {
    console.warn = previousWarn
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = previousNodeEnv
    }
  }
})

test('validates single-variant and live-update Android render payloads', () => {
  withDevelopmentWarnings((warnings) => {
    renderAndroidVariantToJson(React.createElement(VoltraAndroid.Column, null, createLayoutChildren(11)))
    renderAndroidLiveUpdateToJson({
      expanded: React.createElement(VoltraAndroid.Row, null, createLayoutChildren(11)),
    })

    assert.equal(warnings.length, 2)
    assert.match(warnings[0], /AndroidColumn/)
    assert.match(warnings[1], /AndroidRow/)
  })
})
