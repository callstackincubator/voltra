import type { ComponentType } from 'react'
import { createElement } from 'react'

import { VoltraModifier } from '../modifiers'
import { getModifiersFromLayoutStyle } from '../styles'

export const VOLTRA_COMPONENT_TAG = Symbol.for('VOLTRA_COMPONENT_TAG')

export type VoltraComponent<TProps extends Record<string, unknown>> = ComponentType<TProps> & {
  displayName: string
  [VOLTRA_COMPONENT_TAG]: true
}

export type VoltraComponentOptions<TProps extends Record<string, unknown>> = {
  toJSON?: (props: TProps) => Record<string, unknown>
}

export const createVoltraComponent = <TProps extends Record<string, unknown>>(
  componentName: string,
  options?: VoltraComponentOptions<TProps>
): VoltraComponent<TProps> => {
  const Component = (props: TProps) => {
    const toJSON = options?.toJSON ? options.toJSON : (props: TProps) => props
    let normalizedProps = toJSON(props)

    if (normalizedProps.style) {
      // Convert from React Native layout style to Voltra modifiers
      const styleModifiers = getModifiersFromLayoutStyle(normalizedProps.style as any)
      const existingModifiers = 'modifiers' in normalizedProps ? (normalizedProps.modifiers as VoltraModifier[]) : []

      // Remove style property and add modifiers
      const { style: _, ...propsWithoutStyle } = normalizedProps
      normalizedProps = {
        ...propsWithoutStyle,
        modifiers: [...existingModifiers, ...styleModifiers],
      }
    }

    return createElement(componentName, normalizedProps)
  }

  Component[VOLTRA_COMPONENT_TAG] = true
  Component.displayName = componentName

  return Component as VoltraComponent<TProps>
}

export const isVoltraComponent = <TProps extends Record<string, unknown>>(
  component: ComponentType<TProps>
): component is VoltraComponent<TProps> => {
  return typeof component === 'function' && VOLTRA_COMPONENT_TAG in component
}
