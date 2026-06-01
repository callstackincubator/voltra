import { build } from 'esbuild'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

await build({
  entryPoints: [path.join(packageDir, 'src/bundle-entry.ts')],
  outfile: path.join(packageDir, 'bundle/android-renderer.js'),
  bundle: true,
  format: 'iife',
  platform: 'neutral',
  target: 'es2017',
  minify: false,
  sourcemap: false,
  legalComments: 'none',
})

console.log('android-renderer bundle written to bundle/android-renderer.js')