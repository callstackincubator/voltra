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
      type: 'hmr_client_error'
      error: Error
    }

function isErrorEvent(event: { type: string }): event is MetroReportableEvent {
  switch (event.type) {
    case 'initialize_failed':
    case 'bundling_error':
    case 'hmr_client_error':
      return true
    default:
      return false
  }
}

export function createErrorOnlyMetroReporter(): { update(event: { type: string }): void } {
  const reporter = new TerminalReporter(new Terminal(process.stderr))

  return {
    update(event) {
      if (!isErrorEvent(event)) {
        return
      }

      reporter.update(event)
    },
  }
}
