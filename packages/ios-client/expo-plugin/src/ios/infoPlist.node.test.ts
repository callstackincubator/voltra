import type { IOSWidgetConfig } from '../types'
import { dynamicWidgetParameterNames } from './infoPlist'

describe('dynamicWidgetParameterNames', () => {
  it('lists every Dynamic Widget with its dynamicOptions parameters, and leaves out payload widgets', () => {
    const widgets = [
      {
        id: 'prayer',
        entry: './widgets/prayer.tsx',
        appIntent: {
          parameters: [
            { name: 'masjid', title: 'Masjid', dynamicOptions: true },
            { name: 'units', title: 'Units', default: 'metric' },
          ],
        },
      },
      { id: 'clock', entry: './widgets/clock.tsx' },
      { id: 'payload' },
    ] as IOSWidgetConfig[]

    expect(dynamicWidgetParameterNames(widgets)).toEqual({ prayer: ['masjid'], clock: [] })
  })

  it('is undefined without Dynamic Widgets, so the key is removed', () => {
    expect(dynamicWidgetParameterNames([{ id: 'payload' }] as IOSWidgetConfig[])).toBeUndefined()
    expect(dynamicWidgetParameterNames(undefined)).toBeUndefined()
  })
})
