import dedent from 'dedent'

import type { AndroidWidgetConfig } from '../../../../types'

/**
 * Generates Kotlin code for a single widget receiver class
 */
export function generateWidgetReceiverClass(widget: AndroidWidgetConfig, packageName: string): string {
  // Sanitize the widget id for use as a Kotlin class name
  const className = `VoltraWidget_${widget.id}Receiver`

  return dedent`
    package ${packageName}.widget

    import voltra.widget.VoltraWidgetReceiver

    /**
     * Auto-generated widget receiver for ${widget.displayName}
     * Widget ID: ${widget.id}
     */
    class ${className} : VoltraWidgetReceiver() {
        override val widgetId: String = "${widget.id}"
    }
  `
}
