import { RESOLVABLE_ENV_IDS } from './constants.js'

const RESOLVABLE_BRAND = Symbol.for('VOLTRA_RESOLVABLE_BRAND')

type ResolvablePrimitive = string | number | boolean | null

export type ResolvableEnvironmentKey = keyof typeof RESOLVABLE_ENV_IDS
export type ResolvableWidgetRenderingMode = 'accented' | 'fullColor' | 'vibrant'

type ResolvableIosWidgetEnvironment = {
  renderingMode: ResolvableWidgetRenderingMode
  showsWidgetContainerBackground: boolean
}

type ResolvableAndroidMaterialEnvironment = {
  [K in Exclude<keyof typeof RESOLVABLE_ENV_IDS, keyof ResolvableIosWidgetEnvironment>]: string
}

export type ResolvableEnvironmentValueMap = ResolvableIosWidgetEnvironment & ResolvableAndroidMaterialEnvironment

type ResolvableBrand = {
  readonly [RESOLVABLE_BRAND]: true
}

export type ResolvableCondition =
  | (ResolvableBrand & {
      readonly kind: 'eq' | 'ne'
      readonly left: ResolvableValue<ResolvablePrimitive>
      readonly right: ResolvableValue<ResolvablePrimitive>
    })
  | (ResolvableBrand & {
      readonly kind: 'and' | 'or'
      readonly conditions: readonly ResolvableCondition[]
    })
  | (ResolvableBrand & {
      readonly kind: 'not'
      readonly condition: ResolvableCondition
    })
  | (ResolvableBrand & {
      readonly kind: 'inList'
      readonly value: ResolvableValue<ResolvablePrimitive>
      readonly values: readonly ResolvableValue<ResolvablePrimitive>[]
    })

export type ResolvableExpression<T> =
  | (ResolvableBrand & {
      readonly kind: 'env'
      readonly key: ResolvableEnvironmentKey
    })
  | (ResolvableBrand & {
      readonly kind: 'when'
      readonly condition: ResolvableCondition
      readonly thenValue: ResolvableValue<T>
      readonly elseValue: ResolvableValue<T>
    })
  | (ResolvableBrand & {
      readonly kind: 'match'
      readonly value: ResolvableValue<ResolvablePrimitive>
      readonly cases: Record<string, ResolvableValue<T>> & { default: ResolvableValue<T> }
    })

export type ResolvableValue<T> = [T] extends [ResolvablePrimitive]
  ? T | ResolvableExpression<T>
  : [T] extends [readonly unknown[]]
  ? { [K in keyof T]: ResolvableValue<T[K]> } | ResolvableExpression<T>
  : [T] extends [object]
  ? { [K in keyof T]: ResolvableValue<T[K]> } | ResolvableExpression<T>
  : T | ResolvableExpression<T>

const createResolvable = <TKind extends string, TValue extends object>(
  kind: TKind,
  value: TValue
): TValue &
  ResolvableBrand & {
    readonly kind: TKind
  } => {
  return Object.freeze({
    ...value,
    kind,
    [RESOLVABLE_BRAND]: true,
  }) as TValue & ResolvableBrand & { readonly kind: TKind }
}

export const isResolvableExpression = (
  value: unknown
): value is ResolvableExpression<unknown> | ResolvableCondition => {
  return typeof value === 'object' && value !== null && RESOLVABLE_BRAND in value
}

export const env: { [K in ResolvableEnvironmentKey]: ResolvableExpression<ResolvableEnvironmentValueMap[K]> } = {
  renderingMode: createResolvable('env', { key: 'renderingMode' }),
  showsWidgetContainerBackground: createResolvable('env', { key: 'showsWidgetContainerBackground' }),
  primary: createResolvable('env', { key: 'primary' }),
  onPrimary: createResolvable('env', { key: 'onPrimary' }),
  primaryContainer: createResolvable('env', { key: 'primaryContainer' }),
  onPrimaryContainer: createResolvable('env', { key: 'onPrimaryContainer' }),
  secondary: createResolvable('env', { key: 'secondary' }),
  onSecondary: createResolvable('env', { key: 'onSecondary' }),
  secondaryContainer: createResolvable('env', { key: 'secondaryContainer' }),
  onSecondaryContainer: createResolvable('env', { key: 'onSecondaryContainer' }),
  tertiary: createResolvable('env', { key: 'tertiary' }),
  onTertiary: createResolvable('env', { key: 'onTertiary' }),
  tertiaryContainer: createResolvable('env', { key: 'tertiaryContainer' }),
  onTertiaryContainer: createResolvable('env', { key: 'onTertiaryContainer' }),
  error: createResolvable('env', { key: 'error' }),
  errorContainer: createResolvable('env', { key: 'errorContainer' }),
  onError: createResolvable('env', { key: 'onError' }),
  onErrorContainer: createResolvable('env', { key: 'onErrorContainer' }),
  background: createResolvable('env', { key: 'background' }),
  onBackground: createResolvable('env', { key: 'onBackground' }),
  surface: createResolvable('env', { key: 'surface' }),
  onSurface: createResolvable('env', { key: 'onSurface' }),
  surfaceVariant: createResolvable('env', { key: 'surfaceVariant' }),
  onSurfaceVariant: createResolvable('env', { key: 'onSurfaceVariant' }),
  outline: createResolvable('env', { key: 'outline' }),
  inverseOnSurface: createResolvable('env', { key: 'inverseOnSurface' }),
  inverseSurface: createResolvable('env', { key: 'inverseSurface' }),
  inversePrimary: createResolvable('env', { key: 'inversePrimary' }),
  widgetBackground: createResolvable('env', { key: 'widgetBackground' }),
}

export const when = <T>(
  condition: ResolvableCondition,
  thenValue: ResolvableValue<T>,
  elseValue: ResolvableValue<T>
): ResolvableExpression<T> => createResolvable('when', { condition, thenValue, elseValue })

export const match = <T>(
  value: ResolvableValue<ResolvablePrimitive>,
  cases: Record<string, ResolvableValue<T>> & { default: ResolvableValue<T> }
): ResolvableExpression<T> => createResolvable('match', { value, cases })

export const eq = (
  left: ResolvableValue<ResolvablePrimitive>,
  right: ResolvableValue<ResolvablePrimitive>
): ResolvableCondition => createResolvable('eq', { left, right })

export const ne = (
  left: ResolvableValue<ResolvablePrimitive>,
  right: ResolvableValue<ResolvablePrimitive>
): ResolvableCondition => createResolvable('ne', { left, right })

export const and = (...conditions: readonly ResolvableCondition[]): ResolvableCondition =>
  createResolvable('and', { conditions })

export const or = (...conditions: readonly ResolvableCondition[]): ResolvableCondition =>
  createResolvable('or', { conditions })

export const not = (condition: ResolvableCondition): ResolvableCondition => createResolvable('not', { condition })

export const inList = (
  value: ResolvableValue<ResolvablePrimitive>,
  values: readonly ResolvableValue<ResolvablePrimitive>[]
): ResolvableCondition => createResolvable('inList', { value, values })
