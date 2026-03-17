import React from 'react'

import type { AreaMarkProps } from './AreaMark.js'
import type { BarMarkProps } from './BarMark.js'
import { VOLTRA_MARK_TAG } from './BarMark.js'
import type { ChartDataPoint, SectorDataPoint } from './chart-types.js'
import { createVoltraComponent } from './createVoltraComponent.js'
import type { LineMarkProps } from './LineMark.js'
import type { PointMarkProps } from './PointMark.js'
import type { ChartProps as GeneratedChartProps } from './props/Chart.js'
import type { RuleMarkProps } from './RuleMark.js'
import type { SectorMarkProps } from './SectorMark.js'

// ---- user-facing prop types ----

type AxisGridStyle = {
  visible?: boolean
  color?: string
  lineWidth?: number
  dash?: number[]
}

export type ChartProps = Omit<
  GeneratedChartProps,
  'marks' | 'foregroundStyleScale' | 'xAxisGridStyle' | 'yAxisGridStyle' | 'style'
> & {
  children?: React.ReactNode
  foregroundStyleScale?: Record<string, string>
  xAxisGridStyle?: AxisGridStyle
  yAxisGridStyle?: AxisGridStyle
  style?: GeneratedChartProps['style'] & { color?: string }
}

// ---- wire encoding helpers ----

type CompactDataPoint = [string | number, number] | [string | number, number, string]
type CompactSectorPoint = [number, string]
type MarkWire = [string, CompactDataPoint[] | CompactSectorPoint[] | null, Record<string, unknown>]

const encodeDataPoints = (data: ChartDataPoint[]): CompactDataPoint[] =>
  data.map((pt) => (pt.series != null ? [pt.x, pt.y, pt.series] : [pt.x, pt.y]))

const encodeSectorPoints = (data: SectorDataPoint[]): CompactSectorPoint[] => data.map((pt) => [pt.value, pt.category])

const encodeAxisGridStyle = (style: AxisGridStyle): Record<string, unknown> => {
  const encoded: Record<string, unknown> = {}
  if (style.visible != null) encoded.v = style.visible
  if (style.color != null) encoded.c = style.color
  if (style.lineWidth != null) encoded.lw = style.lineWidth
  if (style.dash != null) encoded.d = style.dash
  return encoded
}

const encodeBarMark = (props: BarMarkProps): MarkWire => {
  const p: Record<string, unknown> = {}
  if (props.color != null) p.c = props.color
  if (props.stacking === 'grouped') p.stk = props.stacking
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
  toJSON: (props) => {
    const {
      children,
      foregroundStyleScale,
      xAxisGridStyle,
      yAxisGridStyle,
      chartScrollableAxes: _chartScrollableAxes,
      ...rest
    } = props as ChartProps & { chartScrollableAxes?: unknown }

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
    if (xAxisGridStyle != null) {
      result.xAxisGridStyle = JSON.stringify(encodeAxisGridStyle(xAxisGridStyle))
    }
    if (yAxisGridStyle != null) {
      result.yAxisGridStyle = JSON.stringify(encodeAxisGridStyle(yAxisGridStyle))
    }

    return result
  },
})
