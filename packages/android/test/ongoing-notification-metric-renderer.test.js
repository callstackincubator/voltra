const assert = require('node:assert/strict')
const test = require('node:test')
const React = require('react')

const { AndroidOngoingNotification } = require('../build/commonjs/index.js')
const { renderAndroidOngoingNotificationPayload } = require('../build/commonjs/server.js')

const renderJson = (content) => JSON.parse(renderAndroidOngoingNotificationPayload(content))

const metric = (props, children) => renderJson(React.createElement(AndroidOngoingNotification.Metric, props, children))

test('renders a metric payload with normalized values', () => {
  const payload = metric({
    title: 'Workout',
    subText: 'Morning run',
    criticalMetric: 1,
    semanticStyle: 'safe',
    metrics: [
      { label: 'Dist', value: { type: 'float', value: 5.2, unit: 'km', fractionDigits: 1 } },
      { label: 'Pace', value: { type: 'text', value: '5:30' } },
    ],
  })

  assert.equal(payload.v, 1)
  assert.equal(payload.kind, 'metric')
  assert.equal(payload.title, 'Workout')
  assert.equal(payload.criticalMetric, 1)
  assert.equal(payload.semanticStyle, 'safe')
  assert.deepEqual(payload.metrics[0], {
    label: 'Dist',
    value: { type: 'float', value: 5.2, unit: 'km', fractionDigits: 1 },
  })
  assert.deepEqual(payload.metrics[1], { label: 'Pace', value: { type: 'text', value: '5:30' } })
})

test('expands number and string shorthands and moves the top-level unit into the value', () => {
  const payload = metric({
    metrics: [
      { label: 'Cups', value: 3 },
      { label: 'Dist', value: 5.2, unit: 'km' },
      { label: 'Status', value: 'Paused' },
    ],
  })

  assert.deepEqual(payload.metrics[0].value, { type: 'int', value: 3 })
  assert.deepEqual(payload.metrics[1].value, { type: 'float', value: 5.2, unit: 'km' })
  assert.deepEqual(payload.metrics[2].value, { type: 'text', value: 'Paused' })
})

test('converts Date endpoints to epoch millis', () => {
  const endsAt = new Date('2026-09-22T10:00:00.000Z')
  const startedAt = new Date('2026-09-22T09:00:00.000Z')

  const payload = metric({
    metrics: [
      { label: 'To go', value: { type: 'timer', endsAt, format: 'chronometer' } },
      { label: 'Elapsed', value: { type: 'stopwatch', startedAt } },
      { label: 'Left', value: { type: 'pausedTimer', remainingMillis: 90_000 } },
    ],
  })

  assert.deepEqual(payload.metrics[0].value, { type: 'timer', endsAt: endsAt.getTime(), format: 'chronometer' })
  assert.deepEqual(payload.metrics[1].value, { type: 'stopwatch', startedAt: startedAt.getTime() })
  assert.deepEqual(payload.metrics[2].value, { type: 'pausedTimer', remainingMillis: 90_000 })
})

test('passes paused stopwatch durations through', () => {
  const payload = metric({ metrics: [{ label: 'Was', value: { type: 'pausedStopwatch', elapsedMillis: 45_000 } }] })

  assert.deepEqual(payload.metrics[0].value, { type: 'pausedStopwatch', elapsedMillis: 45_000 })
})

test('shares the common display fields including the countdown chip', () => {
  const payload = metric({
    shortCriticalText: 'Go',
    when: 1_800_000_000_000,
    chronometer: 'countDown',
    metrics: [{ label: 'Dist', value: 1 }],
    largeIcon: { assetName: 'run' },
  })

  assert.equal(payload.chronometer, true)
  assert.equal(payload.chronometerCountDown, true)
  assert.equal(payload.when, 1_800_000_000_000)
  assert.equal(payload.shortCriticalText, 'Go')
  assert.deepEqual(payload.largeIcon, { assetName: 'run' })
})

test('keeps Action children', () => {
  const payload = metric(
    { metrics: [{ label: 'Dist', value: 1 }] },
    React.createElement(AndroidOngoingNotification.Action, { title: 'Open', deepLinkUrl: 'app://run' })
  )

  assert.deepEqual(payload.actions, [{ title: 'Open', deepLinkUrl: 'app://run' }])
})

const rejects = (props, messagePart, children) => {
  assert.throws(
    () => metric(props, children),
    (error) => {
      assert.match(error.message, messagePart)
      return true
    }
  )
}

test('rejects a metric set outside 1..3', () => {
  rejects({ metrics: [] }, /between 1 and 3/)
  rejects({ metrics: Array.from({ length: 4 }, (_, i) => ({ label: `M${i}`, value: i })) }, /between 1 and 3/)
})

test('rejects labels outside 1..10 characters', () => {
  rejects({ metrics: [{ label: '', value: 1 }] }, /non-empty string/)
  rejects({ metrics: [{ label: 'ElevenChar!', value: 1 }] }, /at most 10 characters/)
})

test('rejects a criticalMetric outside the metric list', () => {
  rejects({ metrics: [{ label: 'Dist', value: 1 }], criticalMetric: 1 }, /between 0 and 0/)
})

test('rejects an unknown semanticStyle', () => {
  rejects({ metrics: [{ label: 'Dist', value: 1 }], semanticStyle: 'urgent' }, /semanticStyle/)
})

test('rejects malformed metric values', () => {
  const one = (value, unit) => ({ metrics: [{ label: 'M', value, unit }] })

  rejects(one({ type: 'time', value: '25:00' }), /HH:mm/)
  rejects(one({ type: 'float', value: 1, min: 5, max: 2 }), /must not exceed/)
  rejects(one({ type: 'float', value: 1, min: -1 }), /greater than or equal to 0/)
  rejects(one({ type: 'float', value: 1, fractionDigits: 1.5 }), /fractionDigits/)
  rejects(one({ type: 'int', value: 1.5 }), /must be an integer/)
  rejects(one({ type: 'pausedTimer', remainingMillis: -1 }), /remainingMillis/)
  rejects(one({ type: 'timer', endsAt: 1, format: 'sandclock' }), /adaptive/)
  rejects(one({ type: 'epoch', value: 1 }), /must be "int"/)
  rejects(one({ type: 'text', value: '' }), /non-empty string/)
  rejects(one({ type: 'timer' }), /endsAt/)
  rejects(one(true), /metric value object/)
  rejects(one({ type: 'timer', endsAt: 1 }, 'km'), /only applies to/)
})

test('applies the countdown rule shared with the other kinds', () => {
  rejects({ metrics: [{ label: 'M', value: 1 }], chronometer: 'countDown' }, /requires the "when" prop/)
})
