import { resolve } from './index';

// Expose for JavaScriptCore / Hermes evaluation in the widget extension.
// Swift calls: context["VoltraRenderer"].resolve(payload, deviceState, appIntentParams)
(globalThis as unknown as Record<string, unknown>)['VoltraRenderer'] = { resolve };