/**
 * Structured logging utility for the Voltra plugin
 */

const PREFIX = '[Voltra]'

// ANSI color codes
const RED = '\x1b[31m'
const RESET = '\x1b[0m'

export const logger = {
  /**
   * Log an informational message
   */
  info: (message: string): void => {
    console.log(`${PREFIX} ${message}`)
  },

  /**
   * Log a warning message
   */
  warn: (message: string): void => {
    console.warn(`${PREFIX} ⚠️  ${message}`)
  },

  /**
   * Log a warning message in red (for critical warnings)
   */
  warnRed: (message: string): void => {
    console.warn(`${RED}${PREFIX} ⚠️  ${message}${RESET}`)
  },

  /**
   * Log an error message
   */
  error: (message: string): void => {
    console.error(`${PREFIX} ❌ ${message}`)
  },

  /**
   * Log a success message
   */
  success: (message: string): void => {
    console.log(`${PREFIX} ✅ ${message}`)
  },

  /**
   * Log a debug message (only when VOLTRA_DEBUG env var is set)
   */
  debug: (message: string): void => {
    if (process.env.VOLTRA_DEBUG) {
      console.log(`${PREFIX} 🔍 ${message}`)
    }
  },
}
