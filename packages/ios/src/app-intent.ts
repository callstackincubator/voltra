/**
 * Returns a template expression that the ios-renderer JS resolver will replace
 * at render time with the widget's AppIntent parameter value.
 *
 * Usage in a widget JSX component:
 *   <Voltra.Text>{appIntentParam('city')}</Voltra.Text>
 *
 * This string passes through the server renderer unchanged and is resolved
 * inside the widget extension process — no server push required when the
 * user reconfigures the widget.
 */
export function appIntentParam(name: string): string {
  return `{{ appIntent.${name} }}`
}