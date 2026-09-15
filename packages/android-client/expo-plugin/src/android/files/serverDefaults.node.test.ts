import { createAndroidWidgetServerDefaults } from './serverDefaults'

describe('createAndroidWidgetServerDefaults', () => {
  it('emits nothing for a widget without serverUpdate', () => {
    expect(createAndroidWidgetServerDefaults([{ id: 'plain' }])).toEqual({})
  })

  it('marks a widget server-driven even when app.json set no url', () => {
    expect(createAndroidWidgetServerDefaults([{ id: 'portfolio', serverUpdate: {} }])).toEqual({
      portfolio: { intervalMinutes: 60, refresh: false },
    })
  })

  it('applies the payload default interval of 60 minutes', () => {
    expect(
      createAndroidWidgetServerDefaults([{ id: 'portfolio', serverUpdate: { url: 'https://a.example.com' } }])
    ).toEqual({
      portfolio: { url: 'https://a.example.com', intervalMinutes: 60, refresh: false },
    })
  })

  it('applies the 15 minute default to a widget with an entry', () => {
    expect(
      createAndroidWidgetServerDefaults([
        { id: 'portfolio', entry: 'widgets/portfolio.tsx', serverUpdate: { url: 'https://a.example.com' } },
      ])
    ).toEqual({
      portfolio: { url: 'https://a.example.com', intervalMinutes: 15, refresh: false },
    })
  })

  it('clamps a widget with an entry up to the interval both platforms can honour', () => {
    expect(
      createAndroidWidgetServerDefaults([
        {
          id: 'portfolio',
          entry: 'widgets/portfolio.tsx',
          serverUpdate: { url: 'https://a.example.com', intervalMinutes: 5 },
        },
      ])
    ).toEqual({
      portfolio: { url: 'https://a.example.com', intervalMinutes: 15, refresh: false },
    })
  })

  it('carries the refresh flag, which stays build-time because the button is generated UI', () => {
    expect(
      createAndroidWidgetServerDefaults([
        { id: 'portfolio', serverUpdate: { url: 'https://a.example.com', refresh: true } },
      ])
    ).toEqual({
      portfolio: { url: 'https://a.example.com', intervalMinutes: 60, refresh: true },
    })
  })
})
