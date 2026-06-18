/**
 * Android resource names (XML filenames, string names, etc.) must contain only lowercase a-z,
 * 0-9, or underscore. Widget ids may be PascalCase — client-rendered widgets use their component
 * name as the id (it is also the Metro bundle URL key and the receiver class-name segment), which
 * is invalid as a resource name. Derive a valid resource-name segment from the id.
 *
 * Idempotent for already-valid (lowercase/underscore) ids, so server widgets are unaffected.
 */
export function androidWidgetResourceId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9_]/g, '_')
}
