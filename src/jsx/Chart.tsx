import React from 'react'
import { createVoltraComponent } from './createVoltraComponent.js'
import type { ChartProps as GeneratedChartProps } from './props/Chart.js'
import type { ChartDataPoint, SectorDataPoint } from './chart-types.js'
import { VOLTRA_MARK_TAG } from './BarMark.js'
import type { BarMarkProps } from './BarMark.js'
import type { LineMarkProps } from './LineMark.js'
import type { AreaMarkProps } from './AreaMark.js'
import type { PointMarkProps } from './PointMark.js'
import type { RuleMarkProps } from './RuleMark.js'
import type { SectorMarkProps } from './SectorMark.js'

// ---- user-facing prop types ----

export type ChartProps = Omit<GeneratedChartProps, 'marks' | 'foregroundStyleScale'> & {
  children?: React.ReactNode
  foregroundStyleScale?: Record<string, string>
}

// ---- wire encoding helpers ----

type CompactDataPoint = [string | number, number] | [string | number, number, string]
type CompactSectorPoint = [number, string]
type MarkWire = [string, CompactDataPoint[] | CompactSectorPoint[] | null, Record<string, unknown>]

const encodeDataPoints = (data: ChartDataPoint[]): CompactDataPoint[] =>
  data.map((pt) => (pt.series != null ? [pt.x, pt.y, pt.series] : [pt.x, pt.y]))

const encodeSectorPoints = (data: SectorDataPoint[]): CompactSectorPoint[] => data.map((pt) => [pt.value, pt.category])

const encodeBarMark = (props: BarMarkProps): MarkWire => {
  const p: Record<string, unknown> = {}
  if (props.color != null) p.c = props.color
  if (props.stacking != null) p.stk = props.stacking
  if (props.cornerRadius != null) p.cr = props.cornerRadius
  if (props.width != null) p.w = props.width
  return ['bar', encodeDataPoints(props.data), p]
}

const encodeLineMark = (props: LineMarkProps): MarkWire => {
  const p: Record<string, unknown> = {}
  if (props.color != null) p.c = props.color
  if (props.interpolation != null) p.itp = props.interpolation
  if (props.lineWidth != null) p.lw = props.lineWidth
  if (props.symbol != null) p.sym = props.symbol
  return ['line', encodeDataPoints(props.data), p]
}

const encodeAreaMark = (props: AreaMarkProps): MarkWire => {
  const p: Record<string, unknown> = {}
  if (props.color != null) p.c = props.color
  if (props.interpolation != null) p.itp = props.interpolation
  if (props.stacking != null) p.stk = props.stacking
  return ['area', encodeDataPoints(props.data), p]
}

const encodePointMark = (props: PointMarkProps): MarkWire => {
  const p: Record<string, unknown> = {}
  if (props.color != null) p.c = props.color
  if (props.symbol != null) p.sym = props.symbol
  if (props.symbolSize != null) p.syms = props.symbolSize
  return ['point', encodeDataPoints(props.data), p]
}

const encodeRuleMark = (props: RuleMarkProps): MarkWire => {
  const p: Record<string, unknown> = {}
  if (props.color != null) p.c = props.color
  if (props.lineWidth != null) p.lw = props.lineWidth
  if (props.xValue != null) p.xv = props.xValue
  if (props.yValue != null) p.yv = props.yValue
  return ['rule', null, p]
}

const encodeSectorMark = (props: SectorMarkProps): MarkWire => {
  const p: Record<string, unknown> = {}
  if (props.color != null) p.c = props.color
  if (props.innerRadius != null) p.ir = props.innerRadius
  if (props.outerRadius != null) p.or = props.outerRadius
  if (props.angularInset != null) p.agin = props.angularInset
  return ['sector', encodeSectorPoints(props.data), p]
}

const ENCODERS: Record<string, (props: any) => MarkWire> = {
  bar: encodeBarMark,
  line: encodeLineMark,
  area: encodeAreaMark,
  point: encodePointMark,
  rule: encodeRuleMark,
  sector: encodeSectorMark,
}

// ---- component ----

export const Chart = createVoltraComponent<ChartProps>('Chart', {
  toJSON: ({ children, foregroundStyleScale, ...rest }) => {
    // Flatten mark children into a compact JSON string
    const marks: MarkWire[] = []

    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return
      const type = child.type as any
      const markType: string | undefined = type[VOLTRA_MARK_TAG]
      if (!markType) return
      const encoder = ENCODERS[markType]
      if (encoder) marks.push(encoder(child.props as any))
    })

    const result: Record<string, unknown> = { ...rest }
    if (marks.length > 0) result.marks = JSON.stringify(marks)
    if (foregroundStyleScale != null) {
      result.foregroundStyleScale = JSON.stringify(Object.entries(foregroundStyleScale))
    }

    return result
  },
})
