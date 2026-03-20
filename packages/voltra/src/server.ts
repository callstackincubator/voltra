/// <reference types="node" />
export { Voltra, renderLiveActivityToString, renderWidgetToString } from '@voltrajs/ios-server'
export type { WidgetVariants } from '@voltrajs/ios-server'

// Widget Server Update Handler
export {
  createWidgetUpdateExpressHandler,
  createWidgetUpdateHandler,
  createWidgetUpdateNodeHandler,
  type WidgetPlatform,
  type WidgetRenderRequest,
  type WidgetUpdateExpressHandler,
  type WidgetUpdateHandler,
  type WidgetUpdateHandlerOptions,
  type WidgetUpdateNodeHandler,
} from './widget-server.js'
