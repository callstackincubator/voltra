import { getNativeVoltra, type Spec } from '../../src/native/NativeVoltra.js'
import { enableDynamicLiveActivityHotReload } from '../../src/utils/enableDynamicLiveActivityHotReload.js'

jest.mock('../../src/native/NativeVoltra.js', () => ({
  getNativeVoltra: jest.fn(),
}))

const mockedGetNativeVoltra = jest.mocked(getNativeVoltra)

describe('enableDynamicLiveActivityHotReload', () => {
  const originalDev = global.__DEV__
  const originalDefinitionUpdated = global.__voltraDynamicLiveActivityDefinitionUpdated

  afterEach(() => {
    global.__DEV__ = originalDev
    global.__voltraDynamicLiveActivityDefinitionUpdated = originalDefinitionUpdated
    jest.clearAllMocks()
  })

  it('reloads only the definition whose generated Metro module changed', () => {
    global.__DEV__ = true
    const reloadDynamicLiveActivities = jest.fn<Promise<void>, [string[] | null]>()
    reloadDynamicLiveActivities.mockResolvedValue(undefined)
    const previous = jest.fn()
    global.__voltraDynamicLiveActivityDefinitionUpdated = previous
    mockedGetNativeVoltra.mockReturnValue({ reloadDynamicLiveActivities } as unknown as Spec)

    const dispose = enableDynamicLiveActivityHotReload()
    global.__voltraDynamicLiveActivityDefinitionUpdated?.('order_finished')

    expect(reloadDynamicLiveActivities).toHaveBeenCalledWith(['order_finished'])
    expect(previous).not.toHaveBeenCalled()

    dispose()
    expect(global.__voltraDynamicLiveActivityDefinitionUpdated).toBe(previous)
  })

  it('does not install a callback in release builds', () => {
    global.__DEV__ = false
    const previous = jest.fn()
    global.__voltraDynamicLiveActivityDefinitionUpdated = previous

    const dispose = enableDynamicLiveActivityHotReload()
    global.__voltraDynamicLiveActivityDefinitionUpdated?.('order_finished')

    expect(mockedGetNativeVoltra).not.toHaveBeenCalled()
    expect(previous).toHaveBeenCalledWith('order_finished')
    dispose()
  })
})
