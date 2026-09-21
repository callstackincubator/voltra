/**
 * Returns the generated ActivityKit attributes type name for a Dynamic Live Activity definition ID.
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
