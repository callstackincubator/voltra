import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, test } from 'node:test'

import {
  assertAndroidIntlPolyfillsInstalled,
  attachVoltraMetroOptions,
  createAndroidIntlPreludeSource,
  intlPolyfillLanguages,
  readVoltraMetroOptions,
  validateAndroidIntlPolyfillsOptions,
} from './intlPolyfills.ts'
import { createWidgetRegistry } from './widgetRegistry.ts'

function makeProject(): { projectRoot: string; cleanup: () => void } {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-metro-intl-'))
  const write = (relativePath: string, contents: string) => {
    fs.mkdirSync(path.dirname(path.join(projectRoot, relativePath)), { recursive: true })
    fs.writeFileSync(path.join(projectRoot, relativePath), contents)
  }
  for (const platform of ['ios', 'android']) {
    write(
      `.voltra/manifest.${platform}.json`,
      JSON.stringify({ version: 1, platform, widgets: [{ id: 'home', entry: 'widgets/home.js' }] })
    )
  }
  write('widgets/home.js', 'export default function Home() { return null }\n')
  return { projectRoot, cleanup: () => fs.rmSync(projectRoot, { recursive: true, force: true }) }
}

describe('Android Intl polyfill prelude (ADR 0008)', () => {
  test('loads the polyfills in dependency order with per-language data', () => {
    const source = createAndroidIntlPreludeSource({ locales: ['en', 'pl-PL', 'pt_BR', 'pt-PT'] })
    const imports = source.split('\n').filter((line) => line.startsWith('import'))

    assert.equal(imports[0], "import '@formatjs/intl-getcanonicallocales/polyfill'")
    assert.equal(imports[1], "import '@formatjs/intl-locale/polyfill'")
    assert.ok(
      imports.indexOf("import '@formatjs/intl-pluralrules/polyfill'") <
        imports.indexOf("import '@formatjs/intl-pluralrules/locale-data/pl'")
    )
    assert.ok(source.includes("import '@formatjs/intl-relativetimeformat/locale-data/pt'"))
    assert.equal(source.match(/intl-pluralrules\/locale-data\/pt'/g)?.length, 1)
    assert.deepEqual(intlPolyfillLanguages(['en-US', 'EN', 'zh-Hant']), ['en', 'zh'])
  })

  test('validates the option', () => {
    assert.equal(validateAndroidIntlPolyfillsOptions(undefined), undefined)
    assert.throws(() => validateAndroidIntlPolyfillsOptions({}), /locales must be an array/)
    assert.throws(() => validateAndroidIntlPolyfillsOptions({ locales: [] }), /at least one language/)
  })

  test('names every missing package instead of failing inside Metro', () => {
    assert.throws(
      () =>
        assertAndroidIntlPolyfillsInstalled('/project', (specifier) => {
          if (specifier.startsWith('@formatjs/intl-locale') || specifier.startsWith('@formatjs/intl-listformat')) {
            throw new Error('not found')
          }
          return specifier
        }),
      /@formatjs\/intl-locale, @formatjs\/intl-listformat are not installed/
    )
    assert.doesNotThrow(() => assertAndroidIntlPolyfillsInstalled('/project', (specifier) => specifier))
  })

  test('carries withVoltra options on the config across a spread', () => {
    const config = attachVoltraMetroOptions({ projectRoot: '/p' }, { androidIntlPolyfills: { locales: ['en'] } })
    assert.deepEqual(readVoltraMetroOptions({ ...config, resolver: {} }), { androidIntlPolyfills: { locales: ['en'] } })
    assert.deepEqual(readVoltraMetroOptions({}), {})
  })

  test('imports the prelude from the Android render shim only', () => {
    const { projectRoot, cleanup } = makeProject()
    try {
      const generatedRoot = path.join(projectRoot, '.voltra', 'metro')
      createWidgetRegistry({ projectRoot, androidIntlPolyfills: { locales: ['en', 'pl'] } })

      const androidShim = fs.readFileSync(path.join(generatedRoot, 'voltra-render-shim.android.js'), 'utf8')
      const iosShim = fs.readFileSync(path.join(generatedRoot, 'voltra-render-shim.ios.js'), 'utf8')
      assert.ok(androidShim.startsWith("import './voltra-intl-polyfills.android.js'\n"))
      assert.ok(!iosShim.includes('polyfill'))
      assert.ok(
        fs
          .readFileSync(path.join(generatedRoot, 'voltra-intl-polyfills.android.js'), 'utf8')
          .includes("import '@formatjs/intl-pluralrules/locale-data/pl'")
      )

      // Turning the option off removes the prelude again.
      createWidgetRegistry({ projectRoot })
      assert.ok(!fs.existsSync(path.join(generatedRoot, 'voltra-intl-polyfills.android.js')))
      assert.ok(
        !fs.readFileSync(path.join(generatedRoot, 'voltra-render-shim.android.js'), 'utf8').includes('polyfills')
      )
    } finally {
      cleanup()
    }
  })
})
