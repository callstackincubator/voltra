import { getNativeVoltra, type Spec } from '../../src/native/NativeVoltra.js'
import { enableDynamicLiveActivityHotReload } from '../../src/utils/enableDynamicLiveActivityHotReload.js'

jest.mock('../../src/native/NativeVoltra.js', () => ({
  getNativeVoltra: jest.fn(),
}))

const mockedGetNativeVoltra = jest.mocked(getNativeVoltra)

const mockReload = () => {
  const reloadDynamicLiveActivities = jest.fn<Promise<void>, [string[] | null]>().mockResolvedValue(undefined)
  mockedGetNativeVoltra.mockReturnValue({ reloadDynamicLiveActivities } as unknown as Spec)
  return reloadDynamicLiveActivities
}

describe('enableDynamicLiveActivityHotReload', () => {
  const originalDev = global.__DEV__
  const originalAccept = global.__accept
  const originalDefinitionUpdated = global.__voltraDynamicLiveActivityDefinitionUpdated

  beforeEach(() => {
    jest.useFakeTimers()
    // Force a fresh hub per test so it wraps this test's `__accept`.
    global.__voltraFastRefreshHub = undefined
  })

  afterEach(() => {
    jest.useRealTimers()
    global.__DEV__ = originalDev
    global.__accept = originalAccept
    global.__voltraFastRefreshHub = undefined
    global.__voltraDynamicLiveActivityDefinitionUpdated = originalDefinitionUpdated
    jest.clearAllMocks()
  })

  it('reloads a definition immediately when it reports outside a Fast Refresh patch', () => {
    global.__DEV__ = true
    const reloadDynamicLiveActivities = mockReload()
    const previous = jest.fn()
    global.__voltraDynamicLiveActivityDefinitionUpdated = previous

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
    const reloadDynamicLiveActivities = mockReload()

    enableDynamicLiveActivityHotReload()
    global.__accept?.('updated-child-module')

    // Debounced: nothing fires until the patch burst settles.
    expect(reloadDynamicLiveActivities).not.toHaveBeenCalled()
    jest.runOnlyPendingTimers()

    expect(previousAccept).toHaveBeenCalledWith('updated-child-module')
    expect(reloadDynamicLiveActivities).toHaveBeenCalledWith(null)
  })

  it('keeps a patch targeted when its generated definition entry is re-evaluated', () => {
    global.__DEV__ = true
    global.__accept = () => {
      global.__voltraDynamicLiveActivityDefinitionUpdated?.('order_finished')
    }
    const reloadDynamicLiveActivities = mockReload()

    enableDynamicLiveActivityHotReload()
    global.__accept?.('updated-generated-entry')
    jest.runOnlyPendingTimers()

    expect(reloadDynamicLiveActivities).toHaveBeenCalledTimes(1)
    expect(reloadDynamicLiveActivities).toHaveBeenCalledWith(['order_finished'])
  })

  it('coalesces multiple __accept calls from one save into a single reload', () => {
    global.__DEV__ = true
    global.__accept = jest.fn()
    const reloadDynamicLiveActivities = mockReload()

    enableDynamicLiveActivityHotReload()
    global.__accept?.('module-a')
    global.__accept?.('module-b')
    global.__accept?.('module-c')
    jest.runOnlyPendingTimers()

    expect(reloadDynamicLiveActivities).toHaveBeenCalledTimes(1)
    expect(reloadDynamicLiveActivities).toHaveBeenCalledWith(null)
  })

  it('stops reloading after dispose', () => {
    global.__DEV__ = true
    global.__accept = jest.fn()
    const reloadDynamicLiveActivities = mockReload()

    const dispose = enableDynamicLiveActivityHotReload()
    dispose()

    global.__accept?.('updated-child-module')
    jest.runOnlyPendingTimers()
    expect(reloadDynamicLiveActivities).not.toHaveBeenCalled()
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
    // The shared hub was never installed, so `__accept` is untouched.
    expect(global.__accept).toBe(previousAccept)
    dispose()
  })
})
