const assert = require('node:assert/strict')
const test = require('node:test')
const React = require('react')

const { AndroidOngoingNotification } = require('../build/commonjs/index.js')
const { renderAndroidOngoingNotificationPayload } = require('../build/commonjs/server.js')

const renderJson = (content) => JSON.parse(renderAndroidOngoingNotificationPayload(content))

test('renders a progress payload with every display field', () => {
  const payload = renderJson(
    React.createElement(
      AndroidOngoingNotification.Progress,
      {
        title: 'Delivering order',
        subText: 'Courier nearby',
        text: '3 stops left',
        value: 7,
        max: 10,
        indeterminate: false,
        shortCriticalText: '72%',
        when: new Date('2026-09-22T10:00:00.000Z'),
        chronometer: true,
        largeIcon: { assetName: 'delivery-large' },
        progressTrackerIcon: { assetName: 'tracker' },
        progressStartIcon: { base64: 'c3RhcnQ=' },
        segments: [{ length: 4, color: '#ff0000' }, { length: 6 }],
        points: [{ position: 4, color: 'rgb(0, 255, 0)' }],
      },
      React.createElement(AndroidOngoingNotification.Action, {
        title: 'Track',
        deepLinkUrl: 'myapp://orders/42',
        icon: { assetName: 'track' },
      })
    )
  )

  assert.deepEqual(payload, {
    v: 1,
    kind: 'progress',
    title: 'Delivering order',
    subText: 'Courier nearby',
    text: '3 stops left',
    value: 7,
    max: 10,
    indeterminate: false,
    shortCriticalText: '72%',
    when: Date.parse('2026-09-22T10:00:00.000Z'),
    chronometer: true,
    largeIcon: { assetName: 'delivery-large' },
    progressTrackerIcon: { assetName: 'tracker' },
    progressStartIcon: { base64: 'c3RhcnQ=' },
    segments: [{ length: 4, color: '#ff0000' }, { length: 6 }],
    points: [{ position: 4, color: 'rgb(0, 255, 0)' }],
    actions: [{ title: 'Track', deepLinkUrl: 'myapp://orders/42', icon: { assetName: 'track' } }],
  })
})

test('renders a bigText payload and defaults bigText to text', () => {
  const payload = renderJson(
    React.createElement(AndroidOngoingNotification.BigText, {
      title: 'Gate change',
      text: 'Gate 42 to 18',
    })
  )

  assert.deepEqual(payload, {
    v: 1,
    kind: 'bigText',
    title: 'Gate change',
    text: 'Gate 42 to 18',
    bigText: 'Gate 42 to 18',
  })
})

test('keeps the payload version at 1', () => {
  const payload = renderJson(React.createElement(AndroidOngoingNotification.Progress, { value: 1, max: 2 }))

  assert.equal(payload.v, 1)
  assert.equal('chronometerCountDown' in payload, false)
})

test('emits chronometer true for true and "countUp" without a countdown flag', () => {
  const when = Date.parse('2026-09-22T10:05:00.000Z')

  for (const chronometer of [true, 'countUp']) {
    const payload = renderJson(
      React.createElement(AndroidOngoingNotification.Progress, { value: 1, max: 2, when, chronometer })
    )

    assert.equal(payload.chronometer, true, `chronometer for ${JSON.stringify(chronometer)}`)
    assert.equal('chronometerCountDown' in payload, false)
  }
})

test('emits chronometerCountDown only for "countDown"', () => {
  const payload = renderJson(
    React.createElement(AndroidOngoingNotification.BigText, {
      text: 'Parking meter',
      when: Date.parse('2026-09-22T11:00:00.000Z'),
      chronometer: 'countDown',
    })
  )

  assert.equal(payload.chronometer, true)
  assert.equal(payload.chronometerCountDown, true)
})

test('keeps chronometer false as-is and omits it when unset', () => {
  const off = renderJson(
    React.createElement(AndroidOngoingNotification.Progress, { value: 1, max: 2, chronometer: false })
  )
  const unset = renderJson(React.createElement(AndroidOngoingNotification.Progress, { value: 1, max: 2 }))

  assert.equal(off.chronometer, false)
  assert.equal('chronometerCountDown' in off, false)
  assert.equal('chronometer' in unset, false)
})

test('rejects a countdown without a target time', () => {
  assert.throws(
    () =>
      renderJson(
        React.createElement(AndroidOngoingNotification.Progress, { value: 1, max: 2, chronometer: 'countDown' })
      ),
    /"chronometer" set to "countDown" requires the "when" prop/
  )
})

test('rejects a chronometer value that is neither a boolean nor a direction', () => {
  assert.throws(
    () =>
      renderJson(
        React.createElement(AndroidOngoingNotification.Progress, {
          value: 1,
          max: 2,
          when: Date.parse('2026-09-22T10:00:00.000Z'),
          chronometer: 'sideways',
        })
      ),
    /"chronometer" must be a boolean, "countUp" or "countDown"/
  )
})

test('rejects progress values outside the range and non-positive max', () => {
  assert.throws(
    () => renderJson(React.createElement(AndroidOngoingNotification.Progress, { value: 3, max: 2 })),
    /"value" must be between 0 and max/
  )
  assert.throws(
    () => renderJson(React.createElement(AndroidOngoingNotification.Progress, { value: 1, max: 0 })),
    /"max" must be greater than 0/
  )
})

test('rejects content that is not an ongoing notification element', () => {
  assert.throws(() => renderJson(React.createElement('View', null)), /must use AndroidOngoingNotification/)
})
