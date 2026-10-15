import * as React from 'react'

import { VoltraView } from '../../src/components/VoltraView.js'
import { subscribeToInteractions } from '../../src/interactions.js'

const ReactTestRenderer = require('react-test-renderer') as {
  act: (callback: () => void | Promise<void>) => Promise<void>
  create: (element: React.ReactElement) => { update: (element: React.ReactElement) => void; unmount: () => void }
}

jest.mock('react-native', () => ({ Platform: { OS: 'ios' }, AppState: { addEventListener: jest.fn() } }))
jest.mock('@use-voltra/ios', () => ({ renderVoltraVariantToJson: () => ({}) }))
jest.mock('../../src/native/VoltraRNNativeComponent', () => () => null)
jest.mock('../../src/interactions.js', () => ({ subscribeToInteractions: jest.fn() }))

const mockedSubscribe = jest.mocked(subscribeToInteractions)

describe('VoltraView interactions', () => {
  it('keeps one source-filtered subscription across re-renders and calls the latest handler', async () => {
    const remove = jest.fn()
    mockedSubscribe.mockReturnValue({ remove })
    const first = jest.fn()
    const second = jest.fn()

    let renderer: ReturnType<typeof ReactTestRenderer.create>
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        React.createElement(VoltraView, { id: 'voltra-view-1', onInteraction: (event) => first(event) }, null)
      )
    })
    await ReactTestRenderer.act(async () => {
      renderer!.update(
        React.createElement(VoltraView, { id: 'voltra-view-1', onInteraction: (event) => second(event) }, null)
      )
    })

    expect(mockedSubscribe).toHaveBeenCalledTimes(1)
    expect(mockedSubscribe.mock.calls[0]![1]).toBe('voltra-view-1')
    const deliver = mockedSubscribe.mock.calls[0]![0]
    deliver({ type: 'interaction', id: 'a', source: 'voltra-view-1', identifier: 'b', payload: '', timestamp: 1 })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', identifier: 'b' }))

    await ReactTestRenderer.act(async () => renderer!.unmount())
    expect(remove).toHaveBeenCalledTimes(1)
  })
})
