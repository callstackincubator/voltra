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
import { StyleSheet } from 'react-native'

import { isVoltraComponent } from '../jsx/createVoltraComponent'
import { getComponentId } from '../payload/component-ids'
import { shorten } from '../payload/short-names'
import { VoltraElementJson, VoltraElementRef, VoltraJson, VoltraNodeJson, VoltraPropValue } from '../types'
import { ContextRegistry, getContextRegistry } from './context-registry'
import { getHooksDispatcher, getReactCurrentDispatcher } from './dispatcher'
import { createElementRegistry, preScanForDuplicates, type ElementRegistry } from './element-registry'
import { getRenderCache } from './render-cache'
import { createStylesheetRegistry, type StylesheetRegistry } from './stylesheet-registry'
import { VoltraVariants } from './types'

type VoltraRenderingContext = {
  registry: ContextRegistry
  stylesheetRegistry?: StylesheetRegistry
  elementRegistry?: ElementRegistry
  duplicates?: Set<ReactNode>
  inStringOnlyContext?: boolean
}

function renderNode(element: ReactNode, context: VoltraRenderingContext): VoltraNodeJson {
  // A. Handle Primitives
  if (element === null || element === undefined || element === false || element === true) {
    throw new Error(`Expected a React element, but got "${typeof element}".`)
  }

  // Handle strings: allow in string-only context, throw error otherwise
  if (typeof element === 'string') {
    if (context.inStringOnlyContext) {
      return element
    }
    throw new Error(
      `Expected a React element, but got "string". Strings are only allowed as children of Text components.`
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
      // Allow multiple children - they should all resolve to strings and will be concatenated
      const results: string[] = []
      for (const child of element) {
        const result = renderNode(child, context)
        if (typeof result !== 'string') {
          throw new Error('Text component children must resolve to strings.')
        }
        results.push(result)
      }
      return results.join('')
    }
    return element.map((child) => renderNode(child, context)).flat() as VoltraNodeJson
  }

  // B. Element Deduplication - check if this element is a duplicate (appears multiple times by reference)
  if (context.duplicates?.has(element) && context.elementRegistry) {
    const existingIndex = context.elementRegistry.isRegistered(element)
    if (existingIndex !== undefined) {
      // Already rendered - return a reference
      return { $r: existingIndex } as VoltraElementRef
    }

    // First encounter of a duplicate - render it, register it, and return a reference
    const rendered = renderNodeInternal(element, context)
    const index = context.elementRegistry.register(element, rendered)
    return { $r: index } as VoltraElementRef
  }

  // Not a duplicate - render inline as usual
  return renderNodeInternal(element, context)
}

function renderNodeInternal(element: ReactNode, context: VoltraRenderingContext): VoltraNodeJson {
  // At this point, element should be an object with type and props properties
  if (typeof element !== 'object' || element === null) {
    throw new Error(`Expected element-like object with type and props, got ${typeof element}`)
  }

  if (!('type' in element) || !('props' in element)) {
    throw new Error(`Expected element-like object with type and props, got ${typeof element}`)
  }

  // Host components
  if (typeof element.type === 'string') {
    throw new Error(`Host component "${element.type}" is not supported in Voltra.`)
  }

  // React built-in elements (checked again for completeness)
  if (isStrictMode(element)) {
    throw new Error('Strict mode is not supported in Voltra.')
  }

  if (isProfiler(element)) {
    throw new Error('Profiler is not supported in Voltra.')
  }

  if (isSuspense(element)) {
    throw new Error('Suspense is not supported in Voltra.')
  }

  if (isPortal(element) || (element as any).type === Symbol.for('react.portal')) {
    throw new Error('Portal is not supported in Voltra.')
  }

  if (isPortal(element)) {
    throw new Error('Portal is not supported in Voltra.')
  }

  // Fragments
  if (isFragment(element)) {
    const fragmentElement = element as ReactElement<{ children?: ReactNode }>
    return renderNode(fragmentElement.props.children, context)
  }

  // Memo, ForwardRef, Lazy, Context, Consumer
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
    const reactContext = (contextConsumerElement.type as any)._context as Context<unknown>
    const value = context.registry.readContext(reactContext)
    const children = contextConsumerElement.props.children

    if (typeof children === 'function') {
      return renderNode(children(value), context)
    }

    throw new Error(`Expected a function as children of a context consumer, but got "${typeof children}".`)
  }

  // Functional/Class components
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

      // Check if child is a valid element-like object
      if (typeof child !== 'object' || child === null || !('type' in child) || !('props' in child)) {
        throw new Error(`Expected a React element, but got "${typeof child}".`)
      }

      if (typeof child.type !== 'string') {
        throw new Error(`Expected a string as the type of a React element, but got "${typeof child.type}".`)
      }

      const { children, ...parameters } = child.props as { children?: ReactNode; [key: string]: unknown }

      // Check if this is a Text component that requires string-only children
      const isTextComponent = child.type === 'Text'
      const childContext: VoltraRenderingContext = {
        ...context,
        inStringOnlyContext: isTextComponent,
      }
      const renderedChildren = children ? renderNode(children, childContext) : isTextComponent ? '' : []

      // Extract id from parameters and remove from props
      const id = typeof parameters.id === 'string' ? parameters.id : undefined

      // Remove id from parameters so it doesn't end up in props
      const { id: _id, ...cleanParameters } = parameters

      if (isTextComponent) {
        // Text component must resolve to a string
        if (typeof renderedChildren !== 'string') {
          throw new Error(
            'Text component children must resolve to a string. ' +
              'Nested components are allowed, but they must eventually resolve to a string.'
          )
        }

        // Transform props to shorten modifier names
        const transformedProps = transformProps(cleanParameters, context, child.type)
        const hasProps = Object.keys(transformedProps).length > 0

        const voltraHostElement: VoltraElementJson = {
          t: getComponentId(child.type),
          ...(id ? { i: id } : {}),
          c: renderedChildren,
          ...(hasProps ? { p: transformedProps } : {}),
        }

        return voltraHostElement
      }

      // For non-Text components, renderedChildren should never be a string
      if (typeof renderedChildren === 'string') {
        throw new Error('Unexpected string in non-Text component children.')
      }

      // Transform props to shorten modifier names
      const transformedProps = transformProps(cleanParameters, context, child.type)
      const hasProps = Object.keys(transformedProps).length > 0
      // Children can be an array (multiple children) or a single element object
      // Empty means: no children at all, or an empty array
      const hasChildren = Array.isArray(renderedChildren) ? renderedChildren.length > 0 : true

      const voltraHostElement: VoltraElementJson = {
        t: getComponentId(child.type),
        ...(id ? { i: id } : {}),
        ...(hasChildren ? { c: renderedChildren } : {}),
        ...(hasProps ? { p: transformedProps } : {}),
      }

      return voltraHostElement
    }

    return renderFunctionalComponent(componentType, reactElement.props, context)
  }

  throw new Error(
    `Unsupported element type "${String((element as any).type)}". Report this as a bug in the Voltra project.`
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
    // 1. Swap Dispatcher
    reactDispatcher.H = getHooksDispatcher(context.registry)
    // 2. Execute Component
    const result = Component(props)

    // 3. Check for async component
    if (result instanceof Promise) {
      throw new Error(
        `Component "${Component.name || 'Anonymous'}" tried to suspend (returned a Promise). ` +
          `Async components are not supported in this synchronous renderer.`
      )
    }

    // 4. Recurse
    return renderNode(result, context)
  } catch (error) {
    // 5. Check for Suspense
    if (error instanceof Promise) {
      throw new Error(
        `Component "${Component.name || 'Anonymous'}" suspended! ` + `Voltra does not support Suspense/Promises.`
      )
    }

    throw error
  } finally {
    // 6. Restore Dispatcher
    reactDispatcher.H = prevHooksDispatcher
  }
}

export const renderVoltraVariantToJson = (element: ReactNode): VoltraNodeJson => {
  const registry = getContextRegistry()
  const context: VoltraRenderingContext = {
    registry,
    // No stylesheet registry for backwards compatibility
  }
  return renderNode(element, context)
}

function compressStyleObject(style: any): any {
  if (style === null || style === undefined) {
    return style
  }

  // Flatten style if it's a StyleSheet reference or array
  const flattened = StyleSheet.flatten(style)

  const compressed: Record<string, any> = {}

  for (const [key, value] of Object.entries(flattened)) {
    const shortKey = shorten(key)

    if (value === null || value === undefined) {
      continue
    }

    // Handle nested objects (e.g., shadowOffset: { width, height })
    if (typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
      const compressedNested: Record<string, any> = {}
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        compressedNested[nestedKey] = nestedValue
      }
      compressed[shortKey] = compressedNested
    } else {
      compressed[shortKey] = value
    }
  }

  return compressed
}

// Helper to detect React elements
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
  context: VoltraRenderingContext,
  componentName?: string
): Record<string, VoltraPropValue> {
  const transformed: Record<string, VoltraPropValue> = {}

  for (const [key, value] of Object.entries(props)) {
    if (key === 'modifiers' && Array.isArray(value)) {
      // Transform modifiers array to [name, args] format
      // Keep 'modifiers' as string key (special case)
      transformed[key] = value.map((modifier: any) => {
        if (typeof modifier === 'object' && modifier !== null) {
          const name = 'name' in modifier ? shorten(String(modifier.name)) : ''
          const args = 'args' in modifier ? modifier.args : {}
          return [name, args]
        }
        return modifier
      })
    } else if (key === 'style') {
      // Use stylesheet registry if available, otherwise fall back to inline compression
      const shortKey = shorten(key)
      if (context.stylesheetRegistry) {
        const index = context.stylesheetRegistry.registerStyle(value as object)
        transformed[shortKey] = index
      } else {
        transformed[shortKey] = compressStyleObject(value)
      }
    } else if (isReactNode(value)) {
      // Serialize JSX elements directly to component objects (no JSON.stringify!)
      const serializedComponent = renderNode(value, {
        registry: getContextRegistry(),
        stylesheetRegistry: context.stylesheetRegistry,
        elementRegistry: context.elementRegistry,
        duplicates: context.duplicates,
        inStringOnlyContext: false,
      })
      const shortKey = shorten(key)
      transformed[shortKey] = serializedComponent
    } else {
      // Regular primitive prop handling - use unified short names
      const shortKey = shorten(key)
      transformed[shortKey] = value as VoltraPropValue
    }
  }

  return transformed
}

/** Current payload version - increment when making breaking changes to payload schema */
export const VOLTRA_PAYLOAD_VERSION = 1

/**
 * Collect all variant nodes for pre-scanning
 */
const collectVariantNodes = (variants: VoltraVariants): ReactNode[] => {
  const nodes: ReactNode[] = []

  if (variants.lockScreen) {
    const lockScreenVariant = variants.lockScreen
    if (typeof lockScreenVariant === 'object' && lockScreenVariant !== null && 'content' in lockScreenVariant) {
      if (lockScreenVariant.content) nodes.push(lockScreenVariant.content)
    } else {
      nodes.push(lockScreenVariant as ReactNode)
    }
  }

  if (variants.island) {
    if (variants.island.expanded) {
      if (variants.island.expanded.center) nodes.push(variants.island.expanded.center)
      if (variants.island.expanded.leading) nodes.push(variants.island.expanded.leading)
      if (variants.island.expanded.trailing) nodes.push(variants.island.expanded.trailing)
      if (variants.island.expanded.bottom) nodes.push(variants.island.expanded.bottom)
    }
    if (variants.island.compact) {
      if (variants.island.compact.leading) nodes.push(variants.island.compact.leading)
      if (variants.island.compact.trailing) nodes.push(variants.island.compact.trailing)
    }
    if (variants.island.minimal) nodes.push(variants.island.minimal)
  }

  return nodes
}

/**
 * Pre-scan all variant nodes to identify duplicate elements across the entire payload
 */
const preScanAllVariants = (variants: VoltraVariants): Set<ReactNode> => {
  const seen = new Set<ReactNode>()
  const duplicates = new Set<ReactNode>()

  const nodes = collectVariantNodes(variants)

  // Scan each variant node for duplicates
  for (const node of nodes) {
    // Also check if the root node itself is duplicated across variants
    if (node && typeof node === 'object') {
      if (seen.has(node)) {
        duplicates.add(node)
      } else {
        seen.add(node)
      }
    }

    // Scan children for duplicates
    const nodeDuplicates = preScanForDuplicates(node)
    for (const dup of nodeDuplicates) {
      duplicates.add(dup)
    }
  }

  return duplicates
}

export const renderVoltraToJson = (variants: VoltraVariants): VoltraJson => {
  const result: VoltraJson = {
    v: VOLTRA_PAYLOAD_VERSION,
  }

  // Pre-scan all variants to identify duplicate elements (by reference)
  const duplicates = preScanAllVariants(variants)

  // Create shared registries for all variants
  const stylesheetRegistry = createStylesheetRegistry()
  const elementRegistry = createElementRegistry()

  const renderVariantToJson = (element: ReactNode): VoltraNodeJson => {
    const registry = getContextRegistry()
    const context: VoltraRenderingContext = {
      registry,
      stylesheetRegistry,
      elementRegistry,
      duplicates,
    }
    return renderNode(element, context)
  }

  const renderCache = getRenderCache(renderVariantToJson)

  if (variants.lockScreen) {
    const lockScreenVariant = variants.lockScreen

    if (typeof lockScreenVariant === 'object' && lockScreenVariant !== null && 'content' in lockScreenVariant) {
      result.ls = renderCache.getOrRender(lockScreenVariant.content)

      if (lockScreenVariant.activityBackgroundTint) {
        result.ls_background_tint = lockScreenVariant.activityBackgroundTint
      }
    } else {
      result.ls = renderCache.getOrRender(lockScreenVariant as ReactNode)
    }
  }

  if (variants.island) {
    if (variants.island.keylineTint) {
      result.isl_keyline_tint = variants.island.keylineTint
    }

    if (variants.island.expanded) {
      if (variants.island.expanded.center) {
        result.isl_exp_c = renderCache.getOrRender(variants.island.expanded.center)
      }
      if (variants.island.expanded.leading) {
        result.isl_exp_l = renderCache.getOrRender(variants.island.expanded.leading)
      }
      if (variants.island.expanded.trailing) {
        result.isl_exp_t = renderCache.getOrRender(variants.island.expanded.trailing)
      }
      if (variants.island.expanded.bottom) {
        result.isl_exp_b = renderCache.getOrRender(variants.island.expanded.bottom)
      }
    }

    if (variants.island.compact) {
      if (variants.island.compact.leading) {
        result.isl_cmp_l = renderCache.getOrRender(variants.island.compact.leading)
      }
      if (variants.island.compact.trailing) {
        result.isl_cmp_t = renderCache.getOrRender(variants.island.compact.trailing)
      }
    }

    if (variants.island.minimal) {
      result.isl_min = renderCache.getOrRender(variants.island.minimal)
    }
  }

  // Add shared elements at the root level (for deduplication)
  const sharedElements = elementRegistry.getElements()
  if (sharedElements.length > 0) {
    result.e = sharedElements
  }

  // Add the shared stylesheet at the root level
  const styles = stylesheetRegistry.getStyles()
  if (styles.length > 0) {
    result.s = styles
  }

  return result
}

export const renderVoltraToString = (variants: VoltraVariants): string => {
  return JSON.stringify(renderVoltraToJson(variants))
}
