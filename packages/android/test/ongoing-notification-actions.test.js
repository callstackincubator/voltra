const assert = require('node:assert/strict')
const test = require('node:test')
const React = require('react')

const { AndroidOngoingNotification } = require('../build/commonjs/index.js')
const {
  renderAndroidOngoingNotificationPayload,
  renderAndroidOngoingNotificationPayloadToJson,
} = require('../build/commonjs/server.js')

const { Action, Progress } = AndroidOngoingNotification

const progressWith = (...actions) =>
  React.createElement(
    Progress,
    { title: 'Workout', value: 18, max: 45 },
    ...actions.map((props, index) => React.createElement(Action, { key: index, ...props }))
  )

const renderActions = (...actions) => renderAndroidOngoingNotificationPayloadToJson(progressWith(...actions)).actions

test('renders the event, reply and deep link actions from the issue example', () => {
  const payload = JSON.parse(
    renderAndroidOngoingNotificationPayload(
      progressWith(
        { title: 'Pause', actionId: 'pause', semanticAction: 'none' },
        {
          title: 'Add tip',
          actionId: 'tip',
          remoteInput: { key: 'tip', label: 'Tip amount', choices: ['10%', '15%', '20%'] },
        },
        { title: 'Open', deepLinkUrl: 'myapp://workout/1' }
      )
    )
  )

  assert.deepEqual(payload, {
    v: 1,
    kind: 'progress',
    title: 'Workout',
    value: 18,
    max: 45,
    actions: [
      { title: 'Pause', actionId: 'pause', semanticAction: 'none' },
      {
        title: 'Add tip',
        actionId: 'tip',
        remoteInput: { key: 'tip', label: 'Tip amount', choices: ['10%', '15%', '20%'] },
      },
      { title: 'Open', deepLinkUrl: 'myapp://workout/1' },
    ],
  })
})

test('keeps v: 1', () => {
  assert.equal(renderAndroidOngoingNotificationPayloadToJson(progressWith({ title: 'Pause', actionId: 'pause' })).v, 1)
})

test('serialises an existing deep link action byte-for-byte as before', () => {
  const json = renderAndroidOngoingNotificationPayload(
    progressWith({ title: 'Track', deepLinkUrl: 'myapp://orders/42', icon: { assetName: 'track' } })
  )

  assert.equal(
    json,
    '{"v":1,"kind":"progress","title":"Workout","value":18,"max":45,"actions":[{"title":"Track","deepLinkUrl":"myapp://orders/42","icon":{"assetName":"track"}}]}'
  )
})

test('an action object contains only the keys that were set', () => {
  const [deepLink, event] = renderActions(
    { title: 'Open', deepLinkUrl: 'myapp://workout/1' },
    { title: 'Pause', actionId: 'pause' }
  )

  assert.deepEqual(Object.keys(deepLink), ['title', 'deepLinkUrl'])
  assert.deepEqual(Object.keys(event), ['title', 'actionId'])
})

test('serialises every event action field', () => {
  const [action] = renderActions({
    title: 'Stop navigation',
    actionId: 'stop',
    payload: '{"route":"home"}',
    icon: { assetName: 'stop' },
    remoteInput: { key: 'reason', allowFreeFormInput: false, choices: ['Arrived', 'Cancelled'] },
    authenticationRequired: true,
    semanticAction: 'delete',
  })

  assert.deepEqual(action, {
    title: 'Stop navigation',
    icon: { assetName: 'stop' },
    actionId: 'stop',
    payload: '{"route":"home"}',
    remoteInput: { key: 'reason', allowFreeFormInput: false, choices: ['Arrived', 'Cancelled'] },
    authenticationRequired: true,
    semanticAction: 'delete',
  })
})

test('accepts authenticationRequired and semanticAction on a deep link action', () => {
  const [action] = renderActions({
    title: 'Call',
    deepLinkUrl: 'myapp://call',
    authenticationRequired: false,
    semanticAction: 'call',
  })

  assert.deepEqual(action, {
    title: 'Call',
    deepLinkUrl: 'myapp://call',
    authenticationRequired: false,
    semanticAction: 'call',
  })
})

test('accepts each of the eleven semantic actions', () => {
  const values = [
    'none',
    'reply',
    'markAsRead',
    'markAsUnread',
    'delete',
    'archive',
    'mute',
    'unmute',
    'thumbsUp',
    'thumbsDown',
    'call',
  ]

  for (const semanticAction of values) {
    assert.equal(renderActions({ title: 'A', actionId: 'a', semanticAction })[0].semanticAction, semanticAction)
  }
})

const rejects = (name, props, pattern) => {
  test(`rejects ${name}`, () => {
    assert.throws(() => renderActions(props), pattern)
  })
}

rejects(
  'an action with both deepLinkUrl and actionId',
  { title: 'A', deepLinkUrl: 'myapp://a', actionId: 'a' },
  /not both/
)
rejects('an action with neither deepLinkUrl nor actionId', { title: 'A' }, /must set "deepLinkUrl" or "actionId"/)
rejects('an empty actionId', { title: 'A', actionId: '' }, /"actionId" must be a non-empty string/)
rejects(
  'remoteInput on a deep link action',
  { title: 'A', deepLinkUrl: 'myapp://a', remoteInput: { key: 'a' } },
  /only allowed on an action with "actionId"/
)
rejects(
  'payload on a deep link action',
  { title: 'A', deepLinkUrl: 'myapp://a', payload: 'x' },
  /only allowed on an action with "actionId"/
)
rejects('an empty remoteInput.key', { title: 'A', actionId: 'a', remoteInput: { key: '' } }, /"remoteInput.key"/)
rejects('remoteInput that is not an object', { title: 'A', actionId: 'a', remoteInput: 'tip' }, /"remoteInput"/)
rejects(
  'remoteInput.choices that is not an array',
  { title: 'A', actionId: 'a', remoteInput: { key: 'a', choices: '10%' } },
  /"remoteInput.choices"/
)
rejects(
  'an empty remoteInput.choices array',
  { title: 'A', actionId: 'a', remoteInput: { key: 'a', choices: [] } },
  /"remoteInput.choices"/
)
rejects(
  'an empty choice',
  { title: 'A', actionId: 'a', remoteInput: { key: 'a', choices: ['10%', ''] } },
  /"remoteInput.choices"/
)
rejects(
  'a non-string choice',
  { title: 'A', actionId: 'a', remoteInput: { key: 'a', choices: [10] } },
  /"remoteInput.choices"/
)
rejects(
  'allowFreeFormInput false without choices',
  { title: 'A', actionId: 'a', remoteInput: { key: 'a', allowFreeFormInput: false } },
  /"remoteInput.allowFreeFormInput"/
)
rejects(
  'a payload that is not a string',
  { title: 'A', actionId: 'a', payload: { id: 1 } },
  /"payload" must be a string/
)
rejects(
  'an unknown semanticAction',
  { title: 'A', actionId: 'a', semanticAction: 'play' },
  /"semanticAction" must be one of/
)
rejects(
  'an authenticationRequired that is not a boolean',
  { title: 'A', actionId: 'a', authenticationRequired: 'yes' },
  /"authenticationRequired" must be a boolean/
)

test('keeps every action beyond three and warns once in development', () => {
  const warnings = []
  const originalWarn = console.warn
  console.warn = (message) => warnings.push(message)
  try {
    const actions = [1, 2, 3, 4].map((index) => ({ title: `Action ${index}`, actionId: `a${index}` }))

    assert.equal(renderActions(...actions).length, 4)
    renderActions(...actions)
    assert.equal(renderActions(...actions.slice(0, 3)).length, 3)
  } finally {
    console.warn = originalWarn
  }

  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /4 actions\. Android shows at most 3/)
})
