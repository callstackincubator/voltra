const assert = require('node:assert/strict')
const test = require('node:test')
const React = require('react')

const android = require('../build/cjs/index.js')
const { createVoltraComponent } = require('../build/cjs/jsx/createVoltraComponent.js')

const {
  ANDROID_COMPONENT_NAME_TO_ID,
  VoltraAndroid,
  getAndroidComponentId,
  renderAndroidLiveUpdateToJson,
  renderAndroidLiveUpdateToString,
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
