#!/usr/bin/env node
import { runBundleWidgetsCli } from '../bundleWidgets'

runBundleWidgetsCli()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(
      `[voltra] widget bundling failed: ${error instanceof Error ? error.stack || error.message : String(error)}`
    )
    process.exit(1)
  })
