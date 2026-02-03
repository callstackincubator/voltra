import dedent from 'dedent'

import type { AndroidWidgetConfig } from '../../../../types'

/**
 * Generates string resources for widget display names and descriptions
 */
export function generateStringResourcesXml(widgets: AndroidWidgetConfig[]): string {
  const stringEntries = widgets
    .map(
      (widget) =>
        `    <string name="voltra_widget_${widget.id}_label">${widget.displayName}</string>\n    <string name="voltra_widget_${widget.id}_description">${widget.description}</string>`
    )
    .join('\n')

  return dedent`
    <?xml version="1.0" encoding="utf-8"?>
    <resources>
        <!-- Voltra Widget Labels and Descriptions (Auto-generated) -->
    ${stringEntries}
    </resources>
  `
}
