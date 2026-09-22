const assert = require('node:assert/strict')
const test = require('node:test')
const React = require('react')

const { AndroidOngoingNotification } = require('../build/commonjs/index.js')
const {
  renderAndroidOngoingNotificationPayload,
  renderAndroidOngoingNotificationPayloadToJson,
} = require('../build/commonjs/server.js')

const { BigPicture, Inbox, Action } = AndroidOngoingNotification

// Payload builders keep absent props as explicit `undefined` so every kind reports the same key set.
// JSON.stringify drops them, which is what the client parses; tests compare the defined keys.
const definedKeys = (value) => {
  if (Array.isArray(value)) {
    return value.map(definedKeys)
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, definedKeys(entry)])

    return Object.fromEntries(entries)
  }

  return value
}

const renderJson = (content) => definedKeys(renderAndroidOngoingNotificationPayloadToJson(content))

test('renders a BigPicture payload from only the required picture prop', () => {
  assert.deepEqual(renderJson(React.createElement(BigPicture, { title: 't', picture: { assetName: 'p' } })), {
    v: 1,
    kind: 'bigPicture',
    title: 't',
    picture: { assetName: 'p' },
  })
})

test('passes every BigPicture prop through to the payload', () => {
  assert.deepEqual(
    renderJson(
      React.createElement(BigPicture, {
        title: 'Parcel delivered',
        subText: 'Signed by neighbour',
        text: 'Left at the front door',
        picture: { assetName: 'delivery_photo_123' },
        summaryText: 'Order 123',
        pictureContentDescription: 'Photo of the parcel at the front door',
        showPictureWhenCollapsed: false,
        largeIcon: { assetName: 'courier_avatar' },
        bigLargeIcon: { base64: 'aW1hZ2U=' },
        hideLargeIconWhenExpanded: true,
        shortCriticalText: 'Done',
        when: 1760000000000,
        chronometer: true,
      })
    ),
    {
      v: 1,
      kind: 'bigPicture',
      title: 'Parcel delivered',
      subText: 'Signed by neighbour',
      text: 'Left at the front door',
      picture: { assetName: 'delivery_photo_123' },
      summaryText: 'Order 123',
      pictureContentDescription: 'Photo of the parcel at the front door',
      showPictureWhenCollapsed: false,
      largeIcon: { assetName: 'courier_avatar' },
      bigLargeIcon: { base64: 'aW1hZ2U=' },
      hideLargeIconWhenExpanded: true,
      shortCriticalText: 'Done',
      when: 1760000000000,
      chronometer: true,
    }
  )
})

test('normalizes a Date passed to the BigPicture when prop', () => {
  const when = new Date(1760000000000)

  assert.equal(renderJson(React.createElement(BigPicture, { picture: { assetName: 'p' }, when })).when, 1760000000000)
})

test('requires a usable picture source on BigPicture', () => {
  const invalidPictures = [undefined, null, {}, { assetName: '' }, { base64: '' }, { uri: 'file:///a.png' }, 'photo']

  for (const picture of invalidPictures) {
    assert.throws(
      () => renderAndroidOngoingNotificationPayloadToJson(React.createElement(BigPicture, { title: 't', picture })),
      { message: /"picture"/ },
      `expected a failure naming picture for ${JSON.stringify(picture)}`
    )
  }
})

test('rejects BigPicture props of the wrong type', () => {
  const invalidProps = [
    ['text', 42],
    ['summaryText', 42],
    ['pictureContentDescription', {}],
    ['subText', false],
    ['shortCriticalText', []],
    ['showPictureWhenCollapsed', 'true'],
    ['hideLargeIconWhenExpanded', 1],
    ['chronometer', 'yes'],
    ['largeIcon', { assetName: 7 }],
    ['bigLargeIcon', 'icon'],
  ]

  for (const [propName, value] of invalidProps) {
    assert.throws(
      () =>
        renderAndroidOngoingNotificationPayloadToJson(
          React.createElement(BigPicture, { picture: { assetName: 'p' }, [propName]: value })
        ),
      { message: new RegExp(`"${propName}"`) },
      `expected a failure naming ${propName}`
    )
  }
})

test('collects Action children into a BigPicture payload', () => {
  const payload = renderJson(
    React.createElement(
      BigPicture,
      { title: 'Parcel delivered', picture: { assetName: 'delivery_photo_123' } },
      React.createElement(Action, { title: 'Confirm', deepLinkUrl: 'myapp://orders/123/confirm' }),
      React.createElement(Action, {
        title: 'Report a problem',
        deepLinkUrl: 'myapp://orders/123/help',
        icon: { assetName: 'help_icon' },
      })
    )
  )

  assert.deepEqual(payload.actions, [
    { title: 'Confirm', deepLinkUrl: 'myapp://orders/123/confirm' },
    { title: 'Report a problem', deepLinkUrl: 'myapp://orders/123/help', icon: { assetName: 'help_icon' } },
  ])
})

test('warns about an oversized inline picture but still renders it', () => {
  const originalWarn = console.warn
  const warnings = []
  console.warn = (...args) => warnings.push(args.join(' '))

  // Base64 grows an image by a third, so the size of the picture and the length of its base64 form
  // are not the same number. The warning has to talk about the picture.
  const base64OfImageBytes = (bytes) => 'A'.repeat(Math.ceil((bytes * 4) / 3))

  let payload
  try {
    renderAndroidOngoingNotificationPayloadToJson(
      React.createElement(BigPicture, { picture: { base64: base64OfImageBytes(256 * 1024 - 1) } })
    )
    payload = renderAndroidOngoingNotificationPayloadToJson(
      React.createElement(BigPicture, { picture: { base64: base64OfImageBytes(256 * 1024 + 1) } })
    )
  } finally {
    console.warn = originalWarn
  }

  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /exceeds 262144 bytes.*assetName/)
  assert.ok(payload.picture.base64.length > 256 * 1024)
})

test('renders an Inbox payload and defaults the collapsed line to the first line', () => {
  assert.deepEqual(renderJson(React.createElement(Inbox, { title: 't', lines: ['a', 'b'] })), {
    v: 1,
    kind: 'inbox',
    title: 't',
    text: 'a',
    lines: ['a', 'b'],
  })
})

test('keeps an explicit Inbox collapsed line instead of the first line', () => {
  const payload = renderJson(
    React.createElement(Inbox, {
      title: '3 stops remaining',
      lines: ['12 Oak Street', '4 Elm Road', 'Depot'],
      text: 'Next: 12 Oak Street',
      summaryText: 'Route 7',
      largeIcon: { assetName: 'route_icon' },
      subText: 'Evening round',
      shortCriticalText: 'Late',
      chronometer: true,
      when: 1760000000000,
    })
  )

  assert.deepEqual(payload, {
    v: 1,
    kind: 'inbox',
    title: '3 stops remaining',
    text: 'Next: 12 Oak Street',
    lines: ['12 Oak Street', '4 Elm Road', 'Depot'],
    summaryText: 'Route 7',
    largeIcon: { assetName: 'route_icon' },
    subText: 'Evening round',
    shortCriticalText: 'Late',
    chronometer: true,
    when: 1760000000000,
  })
})

test('requires between one and six non-empty Inbox lines', () => {
  const invalidLines = [undefined, null, 'a', [], ['a', ''], ['a', 7], ['a', 'b', 'c', 'd', 'e', 'f', 'g']]

  for (const lines of invalidLines) {
    assert.throws(
      () => renderAndroidOngoingNotificationPayloadToJson(React.createElement(Inbox, { title: 't', lines })),
      { message: /"lines/ },
      `expected a failure naming lines for ${JSON.stringify(lines)}`
    )
  }
})

test('rejects an empty explicit Inbox collapsed line', () => {
  assert.throws(
    () => renderAndroidOngoingNotificationPayloadToJson(React.createElement(Inbox, { lines: ['a'], text: '' })),
    { message: /"text"/ }
  )
})

test('collects Action children into an Inbox payload', () => {
  const payload = renderJson(
    React.createElement(
      Inbox,
      { title: '3 stops remaining', lines: ['12 Oak Street'] },
      React.createElement(Action, { title: 'Open route', deepLinkUrl: 'myapp://routes/7' })
    )
  )

  assert.deepEqual(payload.actions, [{ title: 'Open route', deepLinkUrl: 'myapp://routes/7' }])
})

test('keeps the string form aligned with the JSON form for the new kinds', () => {
  const contents = [
    React.createElement(BigPicture, {
      title: 'Parcel delivered',
      text: 'Left at the front door',
      picture: { assetName: 'delivery_photo_123' },
      largeIcon: { assetName: 'courier_avatar' },
      hideLargeIconWhenExpanded: true,
      pictureContentDescription: 'Photo of the parcel at the front door',
      summaryText: 'Order 123',
    }),
    React.createElement(Inbox, {
      title: '3 stops remaining',
      lines: ['12 Oak Street', '4 Elm Road', 'Depot'],
      summaryText: 'Route 7',
      chronometer: true,
      when: 1760000000000,
    }),
  ]

  for (const content of contents) {
    assert.equal(
      renderAndroidOngoingNotificationPayload(content),
      JSON.stringify(renderAndroidOngoingNotificationPayloadToJson(content))
    )
  }
})

test('names all four layouts when the root element is not a supported layout', () => {
  const { BigText } = AndroidOngoingNotification

  assert.equal(renderJson(React.createElement(BigText, { text: 'body' })).kind, 'bigText')

  assert.throws(() => renderAndroidOngoingNotificationPayloadToJson(React.createElement('View', null)), {
    message:
      /[\s\S]*AndroidOngoingNotification\.Progress[\s\S]*AndroidOngoingNotification\.BigText[\s\S]*AndroidOngoingNotification\.BigPicture[\s\S]*AndroidOngoingNotification\.Inbox/,
  })
})
