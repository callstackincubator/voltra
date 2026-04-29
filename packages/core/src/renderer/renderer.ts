import {
  ComponentType,
  ConsumerProps,
  Context,
  ForwardRefExoticComponent,
  FunctionComponent,
  LazyExoticComponent,
  MemoExoticComponent,
  ProviderProps,
  ReactElement,
  ReactNode,
} from 'react'
import {
  isContextConsumer,
  isContextProvider,
  isForwardRef,
  isFragment,
  isLazy,
  isMemo,
  isPortal,
  isProfiler,
  isStrictMode,
  isSuspense,
} from 'react-is'

import { isVoltraComponent } from '../jsx/createVoltraComponent.js'
import { shorten } from '../payload/short-names.js'
import type { ResolvableCondition } from '../resolvable/public.js'
import {
  isResolvableValueExpression,
  serializeCondition,
  serializeResolvablePropValue,
  serializeStyleObject,
} from '../resolvable/serialize.js'
import { VoltraElementRef, VoltraNodeJson, VoltraPropValue } from '../types.js'
import { ContextRegistry, getContextRegistry } from './context-registry.js'
import { getHooksDispatcher, getReactCurrentDispatcher } from './dispatcher.js'
import { createElementRegistry, type ElementRegistry, preScanForDuplicates } from './element-registry.js'
import { getRenderCache, type RenderCache } from './render-cache.js'
import { createStylesheetRegistry, type StylesheetRegistry } from './stylesheet-registry.js'

export type ComponentRegistry = {
  getComponentId: (name: string) => number
}

type VoltraRenderingContext = {
  registry: ContextRegistry
  stylesheetRegistry?: StylesheetRegistry
  elementRegistry?: ElementRegistry
  duplicates?: Set<ReactNode>
  inStringOnlyContext?: boolean
  componentRegistry: ComponentRegistry
}

function renderNode(element: ReactNode, context: VoltraRenderingContext): VoltraNodeJson {
  if (element === null || element === undefined) {
    return []
  }

  if (typeof element === 'boolean') {
    if (context.inStringOnlyContext) {
      return ''
    }
    return []
  }

  if (typeof element === 'string') {
    if (context.inStringOnlyContext) {
      return element
    }
    throw new Error(
      'Expected a React element, but got "string". Strings are only allowed as children of Text components.'
    )
  }

  if (typeof element === 'number' || typeof element === 'bigint') {
    if (context.inStringOnlyContext) {
      return String(element)
    }
    throw new Error(`Expected a React element, but got "${typeof element}".`)
  }

  if (Array.isArray(element)) {
    if (context.inStringOnlyContext) {
      if (element.length === 0) {
        throw new Error('Text component must have at least one child that resolves to a string.')
      }
      const results: string[] = []
      for (const child of element) {
        const result = renderNode(child, context)
        if (Array.isArray(result) && result.length === 0) {
          continue
        }
        if (typeof result !== 'string') {
          throw new Error('Text component children must resolve to strings.')
        }
        results.push(result)
      }
      return results.join('')
    }
    return element.map((child) => renderNode(child, context)).flat() as VoltraNodeJson
  }

  if (context.duplicates?.has(element) && context.elementRegistry) {
    const existingIndex = context.elementRegistry.isRegistered(element)
    if (existingIndex !== undefined) {
      return { $r: existingIndex } as VoltraElementRef
    }

    const rendered = renderNodeInternal(element, context)
    const index = context.elementRegistry.register(element, rendered)
    return { $r: index } as VoltraElementRef
  }

  return renderNodeInternal(element, context)
}

function renderNodeInternal(element: ReactNode, context: VoltraRenderingContext): VoltraNodeJson {
  if (typeof element !== 'object' || element === null) {
    throw new Error(`Expected element-like object with type and props, got ${typeof element}`)
  }

  if (!('type' in element) || !('props' in element)) {
    throw new Error(`Expected element-like object with type and props, got ${typeof element}`)
  }

  if (typeof element.type === 'string') {
    throw new Error(`Host component "${element.type}" is not supported in Voltra.`)
  }

  if (isStrictMode(element)) {
    throw new Error('Strict mode is not supported in Voltra.')
  }
  if (isProfiler(element)) {
    throw new Error('Profiler is not supported in Voltra.')
  }
  if (isSuspense(element)) {
    throw new Error('Suspense is not supported in Voltra.')
  }
  if (isPortal(element) || (element as { type?: unknown }).type === Symbol.for('react.portal')) {
    throw new Error('Portal is not supported in Voltra.')
  }

  if (isFragment(element) || (element as { type?: unknown }).type === Symbol.for('react.fragment')) {
    const fragmentElement = element as ReactElement<{ children?: ReactNode }>
    return renderNode(fragmentElement.props.children, context)
  }

  if (isMemo(element)) {
    const memoElement = element as ReactElement<unknown, MemoExoticComponent<ComponentType<unknown>>>
    const { type: memoizedComponent } = memoElement.type
    return renderNode({ ...memoElement, type: memoizedComponent }, context)
  }

  if (isForwardRef(element)) {
    const forwardRefElement = element as ReactElement<unknown, ForwardRefExoticComponent<ComponentType<unknown>>>
    const { render } = forwardRefElement.type as unknown as { render: (props: unknown) => ReactNode }
    return renderFunctionalComponent(render, forwardRefElement.props, context)
  }

  if (isLazy(element)) {
    const lazyElement = element as ReactElement<unknown, LazyExoticComponent<ComponentType<unknown>>>
    const { lazy } = lazyElement.type as unknown as { lazy: () => ReactNode }
    return renderNode(lazy(), context)
  }

  if (isContextProvider(element)) {
    const contextProviderElement = element as ReactElement<ProviderProps<unknown>>
    const reactContext = contextProviderElement.type as Context<unknown>
    const { value, children } = contextProviderElement.props
    context.registry.pushProvider(reactContext, value)
    const result = renderNode(children, context)
    context.registry.popProvider(reactContext)
    return result
  }

  if (isContextConsumer(element)) {
    const contextConsumerElement = element as ReactElement<ConsumerProps<unknown>>
    const reactContext = (contextConsumerElement.type as unknown as { _context: Context<unknown> })._context
    const value = context.registry.readContext(reactContext)
    const children = contextConsumerElement.props.children

    if (typeof children === 'function') {
      return renderNode(children(value), context)
    }

    throw new Error(`Expected a function as children of a context consumer, but got "${typeof children}".`)
  }

  if (
    element != null &&
    typeof element === 'object' &&
    'type' in element &&
    'props' in element &&
    typeof (element as { type: unknown }).type === 'function'
  ) {
    const reactElement = element as ReactElement
    const componentType = reactElement.type as FunctionComponent<unknown>

    if (componentType.prototype && 'render' in componentType.prototype) {
      throw new Error('Class components are not supported in Voltra.')
    }

    if (isVoltraComponent(componentType)) {
      const child = componentType(reactElement.props)

      if (typeof child !== 'object' || child === null || !('type' in child) || !('props' in child)) {
        throw new Error(`Expected a React element, but got "${typeof child}".`)
      }

      if (typeof child.type !== 'string') {
        throw new Error(`Expected a string as the type of a React element, but got "${typeof child.type}".`)
      }

      const { children, ...parameters } = child.props as { children?: ReactNode; [key: string]: unknown }
      const isTextComponent = child.type === 'Text' || child.type === 'AndroidText'
      const isIfComponent = child.type === 'ControlIf' || child.type === 'AndroidControlIf'
      const isMatchComponent = child.type === 'ControlSwitch' || child.type === 'AndroidControlSwitch'

      // Short-circuit: ResolvableExpression as children of a Text component is serialized
      // via p.txt (wire key for "text") so the native resolver handles it at render time.
      if (isTextComponent && isResolvableValueExpression(children)) {
        const id = typeof parameters.id === 'string' ? parameters.id : undefined
        const { id: _id, ...cleanParameters } = parameters
        const transformedProps = transformProps({ ...cleanParameters, text: children }, context)
        const hasProps = Object.keys(transformedProps).length > 0
        return {
          t: context.componentRegistry.getComponentId(child.type),
          ...(id ? { i: id } : {}),
          c: '',
          ...(hasProps ? { p: transformedProps } : {}),
        }
      }

      const childContext: VoltraRenderingContext = {
        ...context,
        inStringOnlyContext: isTextComponent,
      }

      if (isIfComponent) {
        const id = typeof parameters.id === 'string' ? parameters.id : undefined
        const condition = parameters.condition as ResolvableCondition
        const elseNode = parameters.else as ReactNode | undefined
        const thenRendered = children !== null && children !== undefined ? renderNode(children, childContext) : []
        const elseRendered =
          elseNode !== null && elseNode !== undefined ? renderNode(elseNode, childContext) : undefined
        const props: Record<string, VoltraPropValue> = {
          [shorten('condition')]: serializeCondition(condition),
        }
        if (elseRendered !== undefined) {
          props[shorten('else')] = elseRendered
        }
        return {
          t: context.componentRegistry.getComponentId(child.type),
          ...(id ? { i: id } : {}),
          c: thenRendered,
          p: props,
        }
      }

      if (isMatchComponent) {
        const id = typeof parameters.id === 'string' ? parameters.id : undefined
        const value = parameters.value
        const cases = parameters.cases as Record<string, ReactNode>
        const serializedValue = serializeResolvablePropValue(value)
        const serializedCases: Record<string, VoltraNodeJson> = {}
        for (const [caseKey, caseNode] of Object.entries(cases)) {
          serializedCases[caseKey] = renderNode(caseNode as ReactNode, childContext)
        }
        return {
          t: context.componentRegistry.getComponentId(child.type),
          ...(id ? { i: id } : {}),
          p: {
            [shorten('value')]: serializedValue,
            [shorten('cases')]: serializedCases,
          },
        }
      }

      const renderedChildren =
        children !== null && children !== undefined ? renderNode(children, childContext) : isTextComponent ? '' : []

      const id = typeof parameters.id === 'string' ? parameters.id : undefined
      const { id: _id, ...cleanParameters } = parameters

      if (isTextComponent) {
        if (typeof renderedChildren !== 'string') {
          throw new Error(
            'Text component children must resolve to a string. Nested components are allowed, but they must eventually resolve to a string.'
          )
        }

        const transformedProps = transformProps(cleanParameters, context)
        const hasProps = Object.keys(transformedProps).length > 0

        return {
          t: context.componentRegistry.getComponentId(child.type),
          ...(id ? { i: id } : {}),
          c: renderedChildren,
          ...(hasProps ? { p: transformedProps } : {}),
        }
      }

      if (typeof renderedChildren === 'string') {
        throw new Error('Unexpected string in non-Text component children.')
      }

      const transformedProps = transformProps(cleanParameters, context)
      const hasProps = Object.keys(transformedProps).length > 0
      const hasChildren = Array.isArray(renderedChildren) ? renderedChildren.length > 0 : true

      return {
        t: context.componentRegistry.getComponentId(child.type),
        ...(id ? { i: id } : {}),
        ...(hasChildren ? { c: renderedChildren } : {}),
        ...(hasProps ? { p: transformedProps } : {}),
      }
    }

    return renderFunctionalComponent(componentType, reactElement.props, context)
  }

  throw new Error(
    `Unsupported element type "${String(
      (element as { type?: unknown }).type
    )}". Report this as a bug in the Voltra project.`
  )
}

export const renderFunctionalComponent = <TProps>(
  Component: FunctionComponent<TProps>,
  props: TProps,
  context: VoltraRenderingContext
): VoltraNodeJson => {
  const reactDispatcher = getReactCurrentDispatcher()
  const prevHooksDispatcher = reactDispatcher.H

  try {
    reactDispatcher.H = getHooksDispatcher(context.registry)
    const result = Component(props)

    if (result instanceof Promise) {
      throw new Error(
        `Component "${
          Component.name || 'Anonymous'
        }" tried to suspend (returned a Promise). Async components are not supported in this synchronous renderer.`
      )
    }

    return renderNode(result, context)
  } catch (error) {
    if (error instanceof Promise) {
      throw new Error(
        `Component "${Component.name || 'Anonymous'}" suspended! Voltra does not support Suspense/Promises.`
      )
    }

    throw error
  } finally {
    reactDispatcher.H = prevHooksDispatcher
  }
}

export const renderVariantToJson = (element: ReactNode, componentRegistry: ComponentRegistry): VoltraNodeJson => {
  const registry = getContextRegistry()
  const context: VoltraRenderingContext = {
    registry,
    componentRegistry,
  }

  return renderNode(element, context)
}

function isReactNode(value: unknown): value is ReactNode {
  if (value === null || value === undefined || value === false || value === true) {
    return false
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
    return false
  }
  if (Array.isArray(value)) {
    return true
  }
  if (typeof value === 'object' && value !== null && 'type' in value && 'props' in value) {
    return true
  }
  return false
}

export function transformProps(
  props: Record<string, unknown>,
  context: VoltraRenderingContext
): Record<string, VoltraPropValue> {
  const transformed: Record<string, VoltraPropValue> = {}

  for (const [key, value] of Object.entries(props)) {
    if (key === 'style') {
      const shortKey = shorten(key)
      if (context.stylesheetRegistry) {
        const index = context.stylesheetRegistry.registerStyle(value as object)
        transformed[shortKey] = index
      } else {
        transformed[shortKey] = serializeStyleObject(value) as VoltraPropValue
      }
    } else if (isReactNode(value)) {
      const serializedComponent = renderNode(value, {
        registry: getContextRegistry(),
        stylesheetRegistry: context.stylesheetRegistry,
        elementRegistry: context.elementRegistry,
        duplicates: context.duplicates,
        inStringOnlyContext: false,
        componentRegistry: context.componentRegistry,
      })
      const shortKey = shorten(key)
      transformed[shortKey] = serializedComponent
    } else {
      const shortKey = shorten(key)
      transformed[shortKey] = serializeResolvablePropValue(value)
    }
  }

  return transformed
}

export const VOLTRA_PAYLOAD_VERSION = 2

export const createVoltraRenderer = (componentRegistry: ComponentRegistry) => {
  const rootNodes: { name: string; node: ReactNode }[] = []

  let duplicates: Set<ReactNode> | undefined
  let stylesheetRegistry: StylesheetRegistry | undefined
  let elementRegistry: ElementRegistry | undefined
  let renderCache: RenderCache | undefined

  const addRootNode = (name: string, node: ReactNode): void => {
    if (node === null || node === undefined) {
      return
    }
    rootNodes.push({ name, node })
  }

  const preScanAllNodes = (): Set<ReactNode> => {
    const seen = new Set<ReactNode>()
    const duplicatesSet = new Set<ReactNode>()

    for (const { node } of rootNodes) {
      if (node && typeof node === 'object') {
        if (seen.has(node)) {
          duplicatesSet.add(node)
        } else {
          seen.add(node)
        }
      }

      const nodeDuplicates = preScanForDuplicates(node)
      for (const dup of nodeDuplicates) {
        duplicatesSet.add(dup)
      }
    }

    return duplicatesSet
  }

  const render = (): Record<string, any> => {
    stylesheetRegistry = createStylesheetRegistry()
    elementRegistry = createElementRegistry()
    duplicates = preScanAllNodes()

    const renderVariantToJson = (element: ReactNode): VoltraNodeJson => {
      const registry = getContextRegistry()
      const context: VoltraRenderingContext = {
        registry,
        stylesheetRegistry,
        elementRegistry,
        duplicates,
        componentRegistry,
      }
      return renderNode(element, context)
    }

    renderCache = getRenderCache(renderVariantToJson)

    const result: Record<string, any> = {
      v: VOLTRA_PAYLOAD_VERSION,
    }

    for (const { name, node } of rootNodes) {
      if (node !== null && node !== undefined) {
        result[name] = renderCache.getOrRender(node)
      }
    }

    const sharedElements = elementRegistry.getElements()
    if (sharedElements.length > 0) {
      result.e = sharedElements
    }

    const styles = stylesheetRegistry.getStyles()
    if (styles.length > 0) {
      result.s = styles
    }

    return result
  }

  return {
    addRootNode,
    render,
  }
}
