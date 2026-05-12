import { VoltraElementJson, VoltraElementRef, VoltraNodeJson } from '../types'

export function assertVoltraElement(result: VoltraNodeJson): asserts result is VoltraElementJson {
  if (typeof result !== 'object' || result === null || Array.isArray(result)) {
    throw new Error(`Expected VoltraElementJson object, got ${typeof result}`)
  }
  if ('$r' in result) {
    throw new Error('Expected VoltraElementJson, got VoltraElementRef')
  }
  if (!('t' in result)) {
    throw new Error('Expected VoltraElementJson with "t" property')
  }
}

export function assertString(result: unknown): asserts result is string {
  if (typeof result !== 'string') {
    throw new Error(`Expected string, got ${typeof result}`)
  }
}

export function assertElementArray(result: unknown): asserts result is VoltraElementJson[] {
  if (!Array.isArray(result)) {
    throw new Error(`Expected array, got ${typeof result}`)
  }
}

export function assertElementRef(result: unknown): asserts result is VoltraElementRef {
  if (typeof result !== 'object' || result === null || Array.isArray(result)) {
    throw new Error(`Expected VoltraElementRef object, got ${typeof result}`)
  }
  if (!('$r' in result)) {
    throw new Error('Expected VoltraElementRef with "$r" property')
  }
}
