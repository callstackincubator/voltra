import { validateAndroidConfigPluginProps } from './validation'

describe('validateAndroidConfigPluginProps', () => {
  it('accepts widgets with required cell sizes', () => {
    expect(() =>
      validateAndroidConfigPluginProps({
        widgets: [
          {
            id: 'demo',
            displayName: 'Demo',
            description: 'Demo widget',
            targetCellWidth: 2,
            targetCellHeight: 2,
          },
        ],
      })
    ).not.toThrow()
  })

  it('rejects duplicate widget ids', () => {
    expect(() =>
      validateAndroidConfigPluginProps({
        widgets: [
          {
            id: 'demo',
            displayName: 'Demo',
            description: 'One',
            targetCellWidth: 2,
            targetCellHeight: 2,
          },
          {
            id: 'demo',
            displayName: 'Demo',
            description: 'Two',
            targetCellWidth: 2,
            targetCellHeight: 2,
          },
        ],
      })
    ).toThrow(/Duplicate Android widget ID/)
  })
})
