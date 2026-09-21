import type { ComponentType } from 'react'
import { createElement } from 'react'

export const VOLTRA_COMPONENT_TAG = Symbol.for('VOLTRA_COMPONENT_TAG')

export type VoltraValidateInfo = {
  props: Record<string, unknown>
  children: unknown[]
}

export type VoltraComponent<TProps extends Record<string, unknown>> = ComponentType<TProps> & {
  displayName: string
  [VOLTRA_COMPONENT_TAG]: true
  validate?: (info: VoltraValidateInfo) => void
}

export type VoltraComponentOptions<TProps extends Record<string, unknown>> = {
  toJSON?: (props: TProps) => Record<string, unknown>
  /**
   * Dev-only validation hook, invoked by the renderer with the component's
   * props and its fully flattened, rendered children. Never invoked in
   * production, and its result never affects the rendered output.
   */
  validate?: (info: VoltraValidateInfo) => void
}

export const createVoltraComponent = <TProps extends Record<string, unknown>>(
  componentName: string,
  options?: VoltraComponentOptions<TProps>
): VoltraComponent<TProps> => {
  const Component = (props: TProps) => {
    const toJSON = options?.toJSON ? options.toJSON : (value: TProps) => value
    const normalizedProps = toJSON(props)

    return createElement(componentName, normalizedProps)
  }

  Component[VOLTRA_COMPONENT_TAG] = true
  Component.displayName = componentName
  Component.validate = options?.validate

  return Component as VoltraComponent<TProps>
}

export const isVoltraComponent = <TProps extends Record<string, unknown>>(
  component: ComponentType<TProps>
): component is VoltraComponent<TProps> => {
  return typeof component === 'function' && VOLTRA_COMPONENT_TAG in component
}
