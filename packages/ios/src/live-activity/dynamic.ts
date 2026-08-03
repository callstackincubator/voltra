/**
 * A JSON-compatible value accepted as Dynamic Live Activity props.
 *
 * Dynamic Live Activities deliberately leave the record opaque in V1: the
 * bundled definition and its server producer own the props contract.
 * @experimental
 */
export type DynamicLiveActivityPropsValue =
  | string
  | number
  | boolean
  | null
  | DynamicLiveActivityPropsValue[]
  | { [key: string]: DynamicLiveActivityPropsValue }

/** @experimental A complete JSON-compatible props record for a Dynamic Live Activity update. */
export type DynamicLiveActivityProps = Record<string, DynamicLiveActivityPropsValue>

/** @experimental The generic ActivityKit content-state shape used by every Dynamic Live Activity. */
export interface DynamicLiveActivityContentState {
  props: DynamicLiveActivityProps
}

/**
 * Returns the generated ActivityKit attributes type name for a definition ID.
 * @experimental
 */
export function getDynamicLiveActivityAttributesType(definitionId: string): string {
  const upperCamelCaseId = definitionId
    .split('_')
    .filter(Boolean)
    .map((segment) => `${segment[0].toUpperCase()}${segment.slice(1)}`)
    .join('')

  return `Voltra${upperCamelCaseId}LiveActivityAttributes`
}
