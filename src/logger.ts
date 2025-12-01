const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const
export type VoltraLogLevel = keyof typeof LEVELS

let currentLevel: VoltraLogLevel = __DEV__ ? 'debug' : 'info'

export const logger = {
  debug: (message: string) => {
    if (LEVELS.debug >= LEVELS[currentLevel]) {
      console.log(`[Voltra] ${message}`)
    }
  },
  info: (message: string) => {
    if (LEVELS.info >= LEVELS[currentLevel]) {
      console.info(`[Voltra] ${message}`)
    }
  },
  warn: (message: string) => {
    if (LEVELS.warn >= LEVELS[currentLevel]) {
      console.warn(`[Voltra] ${message}`)
    }
  },
  error: (message: string) => {
    if (LEVELS.error >= LEVELS[currentLevel]) {
      console.error(`[Voltra] ${message}`)
    }
  },
  setLevel: (level: VoltraLogLevel) => {
    currentLevel = level
  },
}
