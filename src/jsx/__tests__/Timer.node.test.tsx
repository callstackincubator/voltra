import React from 'react'

import { renderVoltraVariantToJson } from '../../renderer/renderer'
import { Timer } from '../Timer'

describe('Timer Component', () => {
  const futureDate = new Date(Date.now() + 10000)
  const pastDate = new Date(Date.now() - 10000)

  test('Countdown mode', () => {
    const output = renderVoltraVariantToJson(<Timer endAtMs={futureDate.getTime()} direction="down" />)
    expect(output.p.dir).toBe('down')
  })

  test('Count up mode', () => {
    const output = renderVoltraVariantToJson(<Timer endAtMs={pastDate.getTime()} direction="up" />)
    expect(output.p.dir).toBe('up')
  })

  test('With template', () => {
    const output = renderVoltraVariantToJson(<Timer endAtMs={futureDate.getTime()} textTemplates="{time} left" />)
    expect(output.p.tt).toBe('{time} left')
  })

  test('Timer style', () => {
    const output = renderVoltraVariantToJson(<Timer endAtMs={futureDate.getTime()} textStyle="timer" />)
    expect(output.p.ts).toBe('timer')
  })

  test('Relative style', () => {
    const output = renderVoltraVariantToJson(<Timer endAtMs={futureDate.getTime()} textStyle="relative" />)
    expect(output.p.ts).toBe('relative')
  })

  test('Past date countdown', () => {
    expect(() => {
      renderVoltraVariantToJson(<Timer endAtMs={pastDate.getTime()} direction="down" />)
    }).not.toThrow()
  })

  test('Date as ISO string', () => {
    const iso = '2024-01-01T00:00:00Z'
    const ts = new Date(iso).getTime()
    const output = renderVoltraVariantToJson(<Timer endAtMs={ts} />)
    expect(output.p.end).toBeDefined()
  })

  test('Date as timestamp', () => {
    const ts = 1704067200000
    const output = renderVoltraVariantToJson(<Timer endAtMs={ts} />)
    expect(output.p.end).toBe(ts)
  })

  test('showHours true (default)', () => {
    const output = renderVoltraVariantToJson(<Timer endAtMs={futureDate.getTime()} showHours={true} />)
    expect(output.p.shrs).toBe(true)
  })

  test('showHours false', () => {
    const output = renderVoltraVariantToJson(<Timer endAtMs={futureDate.getTime()} showHours={false} />)
    expect(output.p.shrs).toBe(false)
  })

  test('showHours omitted uses default', () => {
    const output = renderVoltraVariantToJson(<Timer endAtMs={futureDate.getTime()} />)
    // When omitted, the prop should not be in the output (native defaults to false now)
    expect(output.p.shrs).toBeUndefined()
  })
})
