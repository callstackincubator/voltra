import { logger } from '../../logger'
import VoltraModule from '../../VoltraModule'
import { startLiveActivity, stopLiveActivity } from '../api'

// Mock VoltraModule
jest.mock('../../VoltraModule', () => ({
  startLiveActivity: jest.fn().mockResolvedValue('activity-id'),
  updateLiveActivity: jest.fn().mockResolvedValue(undefined),
  endLiveActivity: jest.fn().mockResolvedValue(undefined),
}))

// Mock logger
jest.mock('../../logger', () => ({
  logger: {
    warn: jest.fn(),
  },
}))

// Mock assertRunningOnApple to true
jest.mock('../../utils/index.js', () => ({
  assertRunningOnApple: () => true,
  useUpdateOnHMR: () => {},
}))

describe('Live Activity Options', () => {
  const variants = { minimal: { t: 't', c: 'min' } } // simplified variants

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('Valid staleDate (future)', async () => {
    const futureDate = Date.now() + 3600000
    await startLiveActivity(variants as any, { staleDate: futureDate })

    expect(VoltraModule.startLiveActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ staleDate: futureDate })
    )
  })

  test('Invalid staleDate (past)', async () => {
    const pastDate = Date.now() - 3600000
    await startLiveActivity(variants as any, { staleDate: pastDate })

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('staleDate'))
    expect(VoltraModule.startLiveActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.objectContaining({ staleDate: pastDate })
    )
  })

  test('Valid relevanceScore', async () => {
    await startLiveActivity(variants as any, { relevanceScore: 0.5 })

    expect(VoltraModule.startLiveActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ relevanceScore: 0.5 })
    )
  })

  test('relevanceScore below 0', async () => {
    await startLiveActivity(variants as any, { relevanceScore: -0.5 })

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('relevanceScore'))
    expect(VoltraModule.startLiveActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ relevanceScore: 0.0 })
    )
  })

  test('relevanceScore above 1', async () => {
    await startLiveActivity(variants as any, { relevanceScore: 1.5 })

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('relevanceScore'))
    expect(VoltraModule.startLiveActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ relevanceScore: 0.0 })
    )
  })

  test('Valid dismissalPolicy', async () => {
    await stopLiveActivity('id', { dismissalPolicy: 'default' } as any)

    expect(VoltraModule.endLiveActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ dismissalPolicy: { type: 'immediate' } })
    )
  })

  test('Invalid dismissalPolicy', async () => {
    await stopLiveActivity('id', { dismissalPolicy: 'invalid' } as any)

    expect(VoltraModule.endLiveActivity).toHaveBeenCalledWith(
      'id',
      expect.objectContaining({ dismissalPolicy: { type: 'immediate' } })
    )
  })

  test('All options undefined', async () => {
    await startLiveActivity(variants as any, {})

    expect(VoltraModule.startLiveActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ relevanceScore: 0.0 })
    )
  })

  test('activityName preserved', async () => {
    await startLiveActivity(variants as any, { activityName: 'my-activity' })

    expect(VoltraModule.startLiveActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ activityId: 'my-activity' })
    )
  })
})
