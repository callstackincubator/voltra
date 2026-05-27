import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(packageDir, 'bundle');

await fs.mkdir(outDir, { recursive: true });

await build({
  entryPoints: [path.join(packageDir, 'src/bundle-entry.ts')],
  bundle: true,
  platform: 'neutral',  // no Node or browser globals
  target: ['es2019'],   // Hermes and JavaScriptCore both support ES2019
  outfile: path.join(outDir, 'ios-renderer.js'),
  minify: true,
  treeShaking: true,
});

console.log('ios-renderer bundle written to bundle/ios-renderer.js');