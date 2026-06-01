export function appIntentParam(name: string): string {
  return `{{ appIntent.${name} }}`
}
