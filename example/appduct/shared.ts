// Schemas and helpers shared by the iOS and Android Appduct tool sets. Each platform registers its
// own tools (see `IosVoltraTools.tsx` and `AndroidVoltraTools.tsx`); only the vocabulary they
// describe their inputs with is common.
import { z } from 'zod'

/**
 * Dynamic Widget and Dynamic Live Activity props are an opaque JSON record — Voltra serializes
 * them straight through to the widget's `(props, env) => JSX` render, so there is no shape to
 * validate here beyond "a JSON object".
 */
export const propsSchema = z.record(z.string(), z.unknown())

/** `WidgetServerUpdateSettings`, as an agent can send it over the wire. */
export const serverUpdateSettingsSchema = z.object({
  url: z.string().optional().describe('Endpoint to fetch from. https, or http to a local dev host in a debug build.'),
  intervalMinutes: z.number().optional().describe('Poll interval in minutes. Clamped to 15 minutes minimum.'),
  enabled: z.boolean().optional().describe('Set false to stop fetching and drive the widget from the app instead.'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  query: z
    .record(z.string(), z.string())
    .optional()
    .describe("Extra query parameters. Voltra's own keys are reserved."),
  headers: z.record(z.string(), z.string()).optional().describe('Extra request headers, for example Authorization.'),
  body: z.unknown().optional().describe('Request body, sent as application/json. Dropped on GET and HEAD.'),
})

/** What a tool returns when the interesting part is that it succeeded at all. */
export const okSchema = z.object({ ok: z.literal(true) })

export const OK = { ok: true } as const

/**
 * Casts a validated JSON record to a Voltra props type. Voltra's props types spell out the JSON
 * value union; `z.record(z.string(), z.unknown())` is the same set of values seen from the wire
 * side, and the payload is re-serialized with `JSON.stringify` before it reaches native either way.
 */
export const asProps = <Props>(props: Record<string, unknown>): Props => props as Props
