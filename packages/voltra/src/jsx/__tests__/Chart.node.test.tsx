import React from 'react'

import { renderVoltraVariantToJson } from '../../renderer/renderer'
import { AreaMark } from '../AreaMark'
import { BarMark } from '../BarMark'
import { Chart } from '../Chart'
import { RuleMark } from '../RuleMark'

const getChartMarks = (output: any): any[] => {
  expect(output.p?.mrk).toBeDefined()
  return JSON.parse(output.p.mrk)
}

describe('Chart serialization', () => {
  test('does not serialize chartScrollableAxes', () => {
    const output = renderVoltraVariantToJson(
      <Chart {...({ chartScrollableAxes: 'horizontal' } as any)}>
        <BarMark data={[{ x: 'Jan', y: 10 }]} />
      </Chart>
    )

    expect(output.p?.chartScrollableAxes).toBeUndefined()
    expect(output.p?.csa).toBeUndefined()
  })

  test('BarMark serializes grouped stacking only', () => {
    const groupedOutput = renderVoltraVariantToJson(
      <Chart>
        <BarMark data={[{ x: 'Jan', y: 10, series: 'A' }]} stacking="grouped" />
      </Chart>
    )
    const groupedMarks = getChartMarks(groupedOutput)
    expect(groupedMarks[0][2].stk).toBe('grouped')

    const defaultOutput = renderVoltraVariantToJson(
      <Chart>
        <BarMark data={[{ x: 'Jan', y: 10, series: 'A' }]} />
      </Chart>
    )
    const defaultMarks = getChartMarks(defaultOutput)
    expect(defaultMarks[0][2].stk).toBeUndefined()
  })

  test('AreaMark does not serialize stacking', () => {
    const output = renderVoltraVariantToJson(
      <Chart>
        <AreaMark data={[{ x: 'Jan', y: 10, series: 'A' }]} />
      </Chart>
    )

    const marks = getChartMarks(output)
    expect(marks[0][2].stk).toBeUndefined()
  })

  test('RuleMark serializes both x and y values when both are provided', () => {
    const output = renderVoltraVariantToJson(
      <Chart>
        <RuleMark xValue="Jan" yValue={75} />
      </Chart>
    )

    const marks = getChartMarks(output)
    expect(marks[0][2].xv).toBe('Jan')
    expect(marks[0][2].yv).toBe(75)
  })

  test('serializes axis grid styles', () => {
    const output = renderVoltraVariantToJson(
      <Chart
        xAxisGridStyle={{ visible: false, color: '#ff0000', lineWidth: 2, dash: [4, 2] }}
        yAxisGridStyle={{ lineWidth: 1.5 }}
      >
        <BarMark data={[{ x: 'Jan', y: 10 }]} />
      </Chart>
    )

    expect(output.p?.xgs).toBeDefined()
    expect(output.p?.ygs).toBeDefined()
    expect(JSON.parse(output.p.xgs)).toEqual({ v: false, c: '#ff0000', lw: 2, d: [4, 2] })
    expect(JSON.parse(output.p.ygs)).toEqual({ lw: 1.5 })
  })
})
