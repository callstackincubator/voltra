import { createVoltraComponent } from './createVoltraComponent'
import type { LinearGradientProps as SwiftLinearGradientProps } from './props/LinearGradient'

// Helper function to convert point to string
const convertPointToString = (point: LinearGradientProps['start'] | LinearGradientProps['end']): string | null => {
  if (!point) return null
  if (typeof point === 'string') return point
  if (Array.isArray(point) && point.length === 2) {
    const [x, y] = point
    if (typeof x === 'number' && typeof y === 'number') {
      // Convert coordinate to closest predefined point
      if (x === 0 && y === 0) return 'topLeading'
      if (x === 0.5 && y === 0) return 'top'
      if (x === 1 && y === 0) return 'topTrailing'
      if (x === 0 && y === 0.5) return 'leading'
      if (x === 0.5 && y === 0.5) return 'center'
      if (x === 1 && y === 0.5) return 'trailing'
      if (x === 0 && y === 1) return 'bottomLeading'
      if (x === 0.5 && y === 1) return 'bottom'
      if (x === 1 && y === 1) return 'bottomTrailing'
      // For custom coordinates, encode as "x,y"
      return `${x},${y}`
    }
    return null
  }
  if (typeof point === 'object' && point.x != null && point.y != null) {
    const x = typeof point.x === 'number' ? point.x : Number(point.x)
    const y = typeof point.y === 'number' ? point.y : Number(point.y)
    if (!Number.isNaN(x) && !Number.isNaN(y)) {
      // Convert coordinate to closest predefined point
      if (x === 0 && y === 0) return 'topLeading'
      if (x === 0.5 && y === 0) return 'top'
      if (x === 1 && y === 0) return 'topTrailing'
      if (x === 0 && y === 0.5) return 'leading'
      if (x === 0.5 && y === 0.5) return 'center'
      if (x === 1 && y === 0.5) return 'trailing'
      if (x === 0 && y === 1) return 'bottomLeading'
      if (x === 0.5 && y === 1) return 'bottom'
      if (x === 1 && y === 1) return 'bottomTrailing'
      // For custom coordinates, encode as "x,y"
      return `${x},${y}`
    }
  }
  return null
}

export type LinearGradientProps = Omit<SwiftLinearGradientProps, 'colors' | 'locations' | 'start' | 'end'> & {
  // Array of colors that represent stops in the gradient (at least 2 required)
  colors: readonly [string, string, ...string[]]
  // Optional array of numbers (0-1) indicating color-stop locations
  locations?: readonly number[] | null
  // Start point of the gradient as {x, y} coordinates (0-1) or predefined string
  start?:
    | { x: number; y: number }
    | [number, number]
    | 'top'
    | 'bottom'
    | 'leading'
    | 'trailing'
    | 'topLeading'
    | 'topTrailing'
    | 'bottomLeading'
    | 'bottomTrailing'
    | 'center'
    | null
  // End point of the gradient as {x, y} coordinates (0-1) or predefined string
  end?:
    | { x: number; y: number }
    | [number, number]
    | 'top'
    | 'bottom'
    | 'leading'
    | 'trailing'
    | 'topLeading'
    | 'topTrailing'
    | 'bottomLeading'
    | 'bottomTrailing'
    | 'center'
    | null
}

export const LinearGradient = createVoltraComponent<LinearGradientProps>('LinearGradient', {
  toJSON: ({ colors, locations, start, end, ...otherProps }) => {
    const updatedProps: SwiftLinearGradientProps = { ...otherProps }

    // Handle colors array (required in Expo API)
    if (Array.isArray(colors)) {
      updatedProps.colors = colors.join('|')
    }

    // Handle locations array (Expo API)
    if (Array.isArray(locations)) {
      // Convert locations to stops format for iOS compatibility
      const stops = colors.map((color: any, index: number) => `${String(color)}@${locations[index]}`)
      updatedProps.stops = stops.join('|')
    }

    // Handle start point (Expo API)
    const startPoint = convertPointToString(start)
    if (startPoint) updatedProps.startPoint = startPoint

    // Handle end point (Expo API)
    const endPoint = convertPointToString(end)
    if (endPoint) updatedProps.endPoint = endPoint

    return updatedProps
  },
})
