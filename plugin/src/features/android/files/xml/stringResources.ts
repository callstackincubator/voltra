import dedent from 'dedent'

import type { AndroidWidgetConfig } from '../../../../types'

/**
 * Generates string resources for widget descriptions
 */
export function generateStringResourcesXml(widgets: AndroidWidgetConfig[]): string {
  const stringEntries = widgets
    .map((widget) => `    <string name="voltra_widget_${widget.id}_description">${widget.description}</string>`)
    .join('\n')

  return dedent`
    <?xml version="1.0" encoding="utf-8"?>
    <resources>
        <!-- Voltra Widget Descriptions (Auto-generated) -->
    ${stringEntries}
    </resources>
  `
}
