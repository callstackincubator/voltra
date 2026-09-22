const assert = require('node:assert/strict')
const test = require('node:test')
const React = require('react')

const { AndroidOngoingNotification, renderAndroidOngoingNotificationPayload } = require('../build/commonjs/server.js')

// The payload is a wire format, so assertions go against the emitted JSON: `undefined` props must not
// appear as keys at all, which is what keeps an older app release from seeing a field it ignores.
const renderProgress = (props) =>
  JSON.parse(renderAndroidOngoingNotificationPayload(React.createElement(AndroidOngoingNotification.Progress, props)))

const renderBigText = (props) =>
  JSON.parse(renderAndroidOngoingNotificationPayload(React.createElement(AndroidOngoingNotification.BigText, props)))

test('keeps the payload version at 1', () => {
  const payload = renderProgress({ value: 32, max: 100 })

  assert.equal(payload.v, 1)
  assert.equal(payload.kind, 'progress')
})

test('omits the timestamp and lock-screen keys the caller left out', () => {
  for (const payload of [renderProgress({ value: 32, max: 100 }), renderBigText({ text: 'Rain delay in effect' })]) {
    assert.equal('showWhen' in payload, false)
    assert.equal('chronometerCountDown' in payload, false)
    assert.equal('publicVersion' in payload, false)
  }
})

test('emits showWhen and publicVersion for a progress payload', () => {
  const payload = renderProgress({
    title: 'Driver is on the way',
    text: 'Arriving in 8 minutes',
    value: 32,
    max: 100,
    when: 1758540000000,
    showWhen: false,
    publicVersion: { title: 'Ride in progress', text: 'Unlock to see driver details' },
  })

  assert.equal(payload.when, 1758540000000)
  assert.equal(payload.showWhen, false)
  assert.deepEqual(payload.publicVersion, { title: 'Ride in progress', text: 'Unlock to see driver details' })
})

test('emits a count-down chronometer and a title-only public version for a big text payload', () => {
  const payload = renderBigText({
    text: 'Workout in progress',
    when: 1758540000000,
    chronometer: true,
    chronometerCountDown: true,
    showWhen: true,
    publicVersion: { title: 'Workout in progress' },
  })

  assert.equal(payload.chronometer, true)
  assert.equal(payload.chronometerCountDown, true)
  assert.equal(payload.showWhen, true)
  assert.deepEqual(payload.publicVersion, { title: 'Workout in progress' })
})

test('normalizes a Date in when the same way as before', () => {
  const payload = renderProgress({ value: 1, max: 100, when: new Date(1758540000000) })

  assert.equal(payload.when, 1758540000000)
})

test('rejects a count-down chronometer without a chronometer', () => {
  assert.throws(() => renderProgress({ value: 1, max: 100, chronometerCountDown: true }), {
    message: /"chronometerCountDown" requires "chronometer"/,
  })

  assert.throws(() => renderBigText({ text: 'Workout', chronometerCountDown: true }), {
    message: /"chronometerCountDown" requires "chronometer"/,
  })
})

test('rejects a public version without a usable title', () => {
  assert.throws(() => renderProgress({ value: 1, max: 100, publicVersion: { title: '' } }), {
    message: /prop "publicVersion\.title" must be a non-empty string/,
  })

  assert.throws(() => renderProgress({ value: 1, max: 100, publicVersion: { text: 'Unlock to see more' } }), {
    message: /prop "publicVersion\.title" must be a non-empty string/,
  })
})

test('accepts an empty public version text, like the other text fields of the content', () => {
  const payload = renderProgress({
    value: 1,
    max: 100,
    title: 'Ride in progress',
    text: '',
    publicVersion: { title: 'Ride in progress', text: '' },
  })

  assert.deepEqual(payload.publicVersion, { title: 'Ride in progress', text: '' })
})

test('rejects malformed timestamp and lock-screen props', () => {
  assert.throws(() => renderProgress({ value: 1, max: 100, showWhen: 'yes' }), {
    message: /prop "showWhen" must be a boolean/,
  })

  assert.throws(() => renderProgress({ value: 1, max: 100, chronometer: true, chronometerCountDown: 1 }), {
    message: /prop "chronometerCountDown" must be a boolean/,
  })

  assert.throws(() => renderBigText({ text: 'Workout', publicVersion: 'Unlock to see more' }), {
    message: /prop "publicVersion" must be an object/,
  })
})

test('rejects content whose root is not an ongoing notification element', () => {
  assert.throws(() => renderAndroidOngoingNotificationPayload(React.createElement('span', null, 'nope')), {
    message: /must use AndroidOngoingNotification\.Progress or AndroidOngoingNotification\.BigText/,
  })
})
