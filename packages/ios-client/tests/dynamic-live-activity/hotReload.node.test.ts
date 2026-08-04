import { getNativeVoltra, type Spec } from '../../src/native/NativeVoltra.js'
import { enableDynamicLiveActivityHotReload } from '../../src/utils/enableDynamicLiveActivityHotReload.js'

jest.mock('../../src/native/NativeVoltra.js', () => ({
  getNativeVoltra: jest.fn(),
}))

const mockedGetNativeVoltra = jest.mocked(getNativeVoltra)

describe('enableDynamicLiveActivityHotReload', () => {
  const originalDev = global.__DEV__
  const originalAccept = global.__accept
  const originalDefinitionUpdated = global.__voltraDynamicLiveActivityDefinitionUpdated

  afterEach(() => {
    global.__DEV__ = originalDev
    global.__accept = originalAccept
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

  it('reloads all definitions when a child Fast Refresh boundary does not re-evaluate its generated entry', () => {
    global.__DEV__ = true
    const previousAccept = jest.fn()
    global.__accept = previousAccept
    const reloadDynamicLiveActivities = jest.fn<Promise<void>, [string[] | null]>().mockResolvedValue(undefined)
    mockedGetNativeVoltra.mockReturnValue({ reloadDynamicLiveActivities } as unknown as Spec)

    const dispose = enableDynamicLiveActivityHotReload()
    global.__accept('updated-child-module')

    expect(previousAccept).toHaveBeenCalledWith('updated-child-module')
    expect(reloadDynamicLiveActivities).toHaveBeenCalledWith(null)

    dispose()
    expect(global.__accept).toBe(previousAccept)
  })

  it('keeps a patch targeted when its generated definition entry is re-evaluated', () => {
    global.__DEV__ = true
    global.__accept = () => {
      global.__voltraDynamicLiveActivityDefinitionUpdated?.('order_finished')
    }
    const reloadDynamicLiveActivities = jest.fn<Promise<void>, [string[] | null]>().mockResolvedValue(undefined)
    mockedGetNativeVoltra.mockReturnValue({ reloadDynamicLiveActivities } as unknown as Spec)

    enableDynamicLiveActivityHotReload()
    global.__accept('updated-generated-entry')

    expect(reloadDynamicLiveActivities).toHaveBeenCalledTimes(1)
    expect(reloadDynamicLiveActivities).toHaveBeenCalledWith(['order_finished'])
  })

  it('does not install a callback in release builds', () => {
    global.__DEV__ = false
    const previousAccept = jest.fn()
    global.__accept = previousAccept
    const previous = jest.fn()
    global.__voltraDynamicLiveActivityDefinitionUpdated = previous

    const dispose = enableDynamicLiveActivityHotReload()
    global.__voltraDynamicLiveActivityDefinitionUpdated?.('order_finished')

    expect(mockedGetNativeVoltra).not.toHaveBeenCalled()
    expect(previous).toHaveBeenCalledWith('order_finished')
    global.__accept('updated-child-module')
    expect(previousAccept).toHaveBeenCalledWith('updated-child-module')
    dispose()
  })
})
