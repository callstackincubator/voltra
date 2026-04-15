import type { ResolvableValue } from '@use-voltra/core'

/** Android color props accept literals or resolvable expressions such as `env.primary`. */
export type AndroidColorValue = ResolvableValue<string>
