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

import { getAndroidComponentId } from '../android/payload/component-ids.js'
import { isVoltraComponent } from '../jsx/createVoltraComponent.js'
import { getComponentId } from '../payload/component-ids.js'
import { shorten } from '../payload/short-names.js'
import { VoltraElementJson, VoltraElementRef, VoltraNodeJson, VoltraPropValue } from '../types.js'
import { ContextRegistry, getContextRegistry } from './context-registry.js'
import { getHooksDispatcher, getReactCurrentDispatcher } from './dispatcher.js'
import { createElementRegistry, type ElementRegistry, preScanForDuplicates } from './element-registry.js'
import { flattenStyle } from './flatten-styles.js'
import { getRenderCache, type RenderCache } from './render-cache.js'
import { createStylesheetRegistry, type StylesheetRegistry } from './stylesheet-registry.js'

/**
 * Component registry interface for looking up component IDs.
 * This allows different platforms (iOS, Android) to have their own component ID mappings.
 */
export type ComponentRegistry = {
  getComponentId: (name: string) => number
}

/**
 * Default component registry using iOS component IDs.
 * Used for backwards compatibility with existing iOS code.
 */
const defaultComponentRegistry: ComponentRegistry = {
  getComponentId: (name: string) => getComponentId(name),
}

/**
 * Android component registry using Android component IDs.
 */
export const androidComponentRegistry: ComponentRegistry = {
  getComponentId: (name: string) => getAndroidComponentId(name),
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
  // A. Handle Primitives
  // null and undefined should be ignored (no nodes produced) - following React's behavior
  if (element === null || element === undefined) {
    return []
  }

  // Booleans are ignored in all contexts (matching React Native's behavior)
  // In non-string contexts: allows optional JSX patterns like {condition && <Component />}
  // In string contexts (Text): matches React Native where booleans render as empty
  if (typeof element === 'boolean') {
    if (context.inStringOnlyContext) {
      return ''
    }
    return []
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
        // Skip empty results (null/undefined rendered to [])
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

  // Fragments - check both via react-is and direct symbol comparison for robustness
  if (isFragment(element) || (element as any).type === Symbol.for('react.fragment')) {
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
      // Renderer should be platform agnostic. I need to revisit this in the future.
      const isTextComponent = child.type === 'Text' || child.type === 'AndroidText'
      const childContext: VoltraRenderingContext = {
        ...context,
        inStringOnlyContext: isTextComponent,
      }
      const renderedChildren =
        children !== null && children !== undefined ? renderNode(children, childContext) : isTextComponent ? '' : []

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
          t: context.componentRegistry.getComponentId(child.type),
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
        t: context.componentRegistry.getComponentId(child.type),
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
    componentRegistry: defaultComponentRegistry,
  }
  return renderNode(element, context)
}

/**
 * Renders a Voltra variant to JSON using Android component mappings.
 */
export const renderAndroidVariantToJson = (element: ReactNode): VoltraNodeJson => {
  const registry = getContextRegistry()
  const context: VoltraRenderingContext = {
    registry,
    componentRegistry: androidComponentRegistry,
  }
  return renderNode(element, context)
}

function compressStyleObject(style: any): any {
  if (style === null || style === undefined) {
    return style
  }

  // Flatten style if it's a StyleSheet reference or array
  const flattened = flattenStyle(style)

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
    if (key === 'style') {
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
        componentRegistry: context.componentRegistry,
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
 * Factory function that creates a Voltra renderer instance.
 * The renderer is agnostic of whether it's used for live activities or widgets.
 *
 * @param componentRegistry - Optional component registry for platform-specific component ID mappings.
 *                            Defaults to iOS component registry for backwards compatibility.
 */
export const createVoltraRenderer = (componentRegistry: ComponentRegistry = defaultComponentRegistry) => {
  // Collect all root nodes for pre-scanning
  const rootNodes: { name: string; node: ReactNode }[] = []

  // Track duplicates across all nodes
  let duplicates: Set<ReactNode> | undefined

  // Create shared registries (will be initialized when render is called)
  let stylesheetRegistry: StylesheetRegistry | undefined
  let elementRegistry: ElementRegistry | undefined
  let renderCache: RenderCache | undefined

  /**
   * Add a root node variant to be rendered.
   * @param name - The name/key for this variant (e.g., 'ls', 'isl_exp_c', 'systemSmall')
   * @param node - The React node to render
   */
  const addRootNode = (name: string, node: ReactNode): void => {
    if (node === null || node === undefined) {
      return
    }
    rootNodes.push({ name, node })
  }

  /**
   * Pre-scan all root nodes to identify duplicate elements (by reference)
   */
  const preScanAllNodes = (): Set<ReactNode> => {
    const seen = new Set<ReactNode>()
    const duplicatesSet = new Set<ReactNode>()

    for (const { node } of rootNodes) {
      // Check if the root node itself is duplicated across variants
      if (node && typeof node === 'object') {
        if (seen.has(node)) {
          duplicatesSet.add(node)
        } else {
          seen.add(node)
        }
      }

      // Scan children for duplicates
      const nodeDuplicates = preScanForDuplicates(node)
      for (const dup of nodeDuplicates) {
        duplicatesSet.add(dup)
      }
    }

    return duplicatesSet
  }

  /**
   * Render all added root nodes and return the final JSON payload.
   * @returns The rendered JSON object with version and all variants
   */
  const render = (): Record<string, any> => {
    // Initialize registries
    stylesheetRegistry = createStylesheetRegistry()
    elementRegistry = createElementRegistry()

    // Pre-scan for duplicates
    duplicates = preScanAllNodes()

    // Create renderer function with context
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

    // Create render cache
    renderCache = getRenderCache(renderVariantToJson)

    // Build result object
    const result: Record<string, any> = {
      v: VOLTRA_PAYLOAD_VERSION,
    }

    // Render all root nodes
    for (const { name, node } of rootNodes) {
      if (node !== null && node !== undefined) {
        result[name] = renderCache.getOrRender(node)
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

  return {
    addRootNode,
    render,
  }
}
