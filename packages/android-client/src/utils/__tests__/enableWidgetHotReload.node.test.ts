import { reloadAndroidWidgets } from '../../widgets/api.js'
import { enableWidgetHotReload } from '../enableWidgetHotReload.js'

jest.mock('../../widgets/api.js', () => ({
  reloadAndroidWidgets: jest.fn(),
}))

const mockedReloadAndroidWidgets = jest.mocked(reloadAndroidWidgets)

describe('enableWidgetHotReload (Android, shared FastRefreshHub)', () => {
  const originalDev = global.__DEV__
  const originalAccept = global.__accept

  beforeEach(() => {
    jest.useFakeTimers()
    // Force a fresh shared hub per test so it wraps this test's `__accept`.
    global.__voltraFastRefreshHub = undefined
    mockedReloadAndroidWidgets.mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
    global.__DEV__ = originalDev
    global.__accept = originalAccept
    global.__voltraFastRefreshHub = undefined
    jest.clearAllMocks()
  })

  it('reloads widgets once per debounced Fast Refresh patch', () => {
    global.__DEV__ = true
    const previousAccept = jest.fn()
    global.__accept = previousAccept

    enableWidgetHotReload()
    global.__accept?.('updated-module')

    // Debounced: nothing fires until the patch burst settles.
    expect(mockedReloadAndroidWidgets).not.toHaveBeenCalled()
    jest.runOnlyPendingTimers()

    expect(previousAccept).toHaveBeenCalledWith('updated-module')
    expect(mockedReloadAndroidWidgets).toHaveBeenCalledTimes(1)
  })

  it('coalesces multiple __accept calls from one save into a single reload', () => {
    global.__DEV__ = true
    global.__accept = jest.fn()

    enableWidgetHotReload()
    global.__accept?.('module-a')
    global.__accept?.('module-b')
    global.__accept?.('module-c')
    jest.runOnlyPendingTimers()

    expect(mockedReloadAndroidWidgets).toHaveBeenCalledTimes(1)
  })

  it('stops reloading after dispose', () => {
    global.__DEV__ = true
    global.__accept = jest.fn()

    const dispose = enableWidgetHotReload()
    dispose()

    global.__accept?.('updated-module')
    jest.runOnlyPendingTimers()
    expect(mockedReloadAndroidWidgets).not.toHaveBeenCalled()
  })

  it('does not subscribe in release builds', () => {
    global.__DEV__ = false
    const previousAccept = jest.fn()
    global.__accept = previousAccept

    const dispose = enableWidgetHotReload()
    // The shared hub was never installed, so `__accept` is untouched.
    expect(global.__accept).toBe(previousAccept)

    global.__accept?.('updated-module')
    jest.runOnlyPendingTimers()
    expect(mockedReloadAndroidWidgets).not.toHaveBeenCalled()
    dispose()
  })
})
