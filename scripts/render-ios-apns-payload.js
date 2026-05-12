#!/usr/bin/env node

require('ts-node/register/transpile-only')

const React = require('react')
const { renderLiveActivityToString, Voltra } = require('../packages/ios-server/src/index.ts')

const render = async () => {
  const renderedAt = Date.now()

  const uiJsonData = await renderLiveActivityToString({
    lockScreen: React.createElement(
      Voltra.View,
      null,
      React.createElement(Voltra.Text, null, `Updated at ${renderedAt}`)
    ),
  })

  const payload = {
    aps: {
      event: 'update',
      timestamp: Math.floor(renderedAt / 1000),
      'content-state': {
        uiJsonData,
      },
    },
  }

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
}

render().catch((error) => {
  console.error(error)
  process.exit(1)
})
