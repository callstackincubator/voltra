import { Terminal, TerminalReporter } from 'metro'

type MetroReportableEvent =
  | {
      type: 'initialize_failed'
      port: number
      error: Error
    }
  | {
      type: 'bundling_error'
      error: Error
    }
  | {
      type: 'cache_read_error'
      error: Error
    }
  | {
      type: 'cache_write_error'
      error: Error
    }
  | {
      type: 'hmr_client_error'
      error: Error
    }
  | {
      type: 'transformer_load_failed'
      error: Error
    }

function isErrorEvent(event: { type: string }): event is MetroReportableEvent {
  switch (event.type) {
    case 'initialize_failed':
    case 'bundling_error':
    case 'cache_read_error':
    case 'cache_write_error':
    case 'hmr_client_error':
    case 'transformer_load_failed':
      return true
    default:
      return false
  }
}

function writeError(type: string, error: Error): void {
  process.stderr.write(`[voltra:metro] ${type}\n`)
  process.stderr.write(`${error.stack ?? error.message}\n`)
}

export function createErrorOnlyMetroReporter(): { update(event: { type: string }): void } {
  const reporter = new TerminalReporter(new Terminal(process.stderr))

  return {
    update(event) {
      if (!isErrorEvent(event)) {
        return
      }

      switch (event.type) {
        case 'cache_read_error':
        case 'cache_write_error':
        case 'transformer_load_failed':
          writeError(event.type, event.error)
          break
        default:
          reporter.update(event)
      }
    },
  }
}
