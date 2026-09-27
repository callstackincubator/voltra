import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import type { IOSWidgetConfig } from '../../types'
import { getIOSWidgetExtensionFiles } from '../../utils/fileDiscovery'
import { generateInfoPlist } from './infoPlist'
import {
  collectSheetStringsForLocale,
  resolveDevelopmentRegion,
  resolveExtensionLocalizations,
  syncExtensionLocalizableStrings,
} from './localization'

const weather: IOSWidgetConfig = {
  id: 'weather',
  entry: './widgets/weather.tsx',
  displayName: { en: 'Weather', pl: 'Pogoda' },
  description: 'Forecast',
  configurationTitle: { en: 'Weather settings', pl: 'Ustawienia pogody' },
  appIntent: {
    parameters: [
      {
        name: 'units',
        title: { en: 'Units', pl: 'Jednostki', de: 'Einheiten' },
        default: 'metric',
        options: [
          { value: 'metric', title: { en: 'Metric', pl: 'Metryczne' } },
          { value: 'imperial', title: 'Imperial' },
        ],
      },
      { name: 'city', title: 'City' },
    ],
  },
}

function withTempDir(run: (dir: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-l10n-'))
  try {
    run(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

describe('resolveExtensionLocalizations', () => {
  it('unions Expo locales, CFBundleLocalizations and widget locale maps', () => {
    expect(
      resolveExtensionLocalizations(
        { locales: { fr: './fr.json' }, ios: { infoPlist: { CFBundleLocalizations: ['es', 'pl'] } } },
        [weather]
      )
    ).toEqual(['de', 'en', 'es', 'fr', 'pl'])
  })

  it('adds en once anything is declared, and nothing when nothing is', () => {
    expect(resolveExtensionLocalizations({ locales: { pl: './pl.json' } }, [])).toEqual(['en', 'pl'])
    expect(resolveExtensionLocalizations({ locales: { 'en-GB': './en.json' } }, [])).toEqual(['en-GB'])
    expect(
      resolveExtensionLocalizations({}, [
        { ...weather, displayName: 'W', configurationTitle: undefined, appIntent: undefined },
      ])
    ).toEqual([])
  })

  it('treats underscore and hyphen spellings as one language and ignores __default', () => {
    expect(
      resolveExtensionLocalizations({ locales: { 'pt-BR': './pt.json' } }, [
        {
          ...weather,
          displayName: { pt_BR: 'Tempo', __default: 'Weather' },
          configurationTitle: undefined,
          appIntent: undefined,
        },
      ])
    ).toEqual(['en', 'pt-BR'])
  })
})

describe('development language', () => {
  const polishFirst = {
    locales: { fr: './fr.json' },
    ios: { infoPlist: { CFBundleDevelopmentRegion: 'pl' } },
  }

  it('reads CFBundleDevelopmentRegion, falling back to en for a missing or build-setting value', () => {
    expect(resolveDevelopmentRegion(polishFirst)).toBe('pl')
    expect(
      resolveDevelopmentRegion({ ios: { infoPlist: { CFBundleDevelopmentRegion: '$(DEVELOPMENT_LANGUAGE)' } } })
    ).toBe('en')
    expect(resolveDevelopmentRegion({})).toBe('en')
  })

  it('declares a non-English development language instead of en', () => {
    expect(resolveExtensionLocalizations(polishFirst, [])).toEqual(['fr', 'pl'])
  })

  it('falls back to the development language before English in Localizable.strings', () => {
    withTempDir((dir) => {
      syncExtensionLocalizableStrings(dir, ['fr', 'pl'], [weather], 'pl')

      const french = fs.readFileSync(path.join(dir, 'fr.lproj', 'Localizable.strings'), 'utf8')
      expect(french).toContain('"voltra_widget_weather_param_units_title" = "Jednostki";')
      expect(fs.existsSync(path.join(dir, 'en.lproj'))).toBe(false)
    })
  })
})

describe('collectSheetStringsForLocale', () => {
  it('resolves every locale-mapped sheet string with language and English fallback', () => {
    expect(collectSheetStringsForLocale([weather], 'pl')).toEqual({
      voltra_widget_weather_intent_title: 'Ustawienia pogody',
      voltra_widget_weather_param_units_title: 'Jednostki',
      voltra_widget_weather_param_units_option_metric: 'Metryczne',
    })
    // `fr` has no translation: the key must still resolve, or the sheet would show it verbatim.
    expect(collectSheetStringsForLocale([weather], 'fr')).toEqual({
      voltra_widget_weather_intent_title: 'Weather settings',
      voltra_widget_weather_param_units_title: 'Units',
      voltra_widget_weather_param_units_option_metric: 'Metric',
    })
  })
})

describe('syncExtensionLocalizableStrings', () => {
  it('writes one Localizable.strings per language and makes each .lproj a target resource', () => {
    withTempDir((dir) => {
      syncExtensionLocalizableStrings(dir, ['en', 'fr', 'pl'], [weather])

      const polish = fs.readFileSync(path.join(dir, 'pl.lproj', 'Localizable.strings'), 'utf8')
      expect(polish).toContain('"voltra_widget_weather_param_units_title" = "Jednostki";')
      // A language with no sheet strings still gets a (comment-only) file so the folder ships.
      const french = fs.readFileSync(path.join(dir, 'fr.lproj', 'Localizable.strings'), 'utf8')
      expect(french).toContain('"voltra_widget_weather_param_units_title" = "Units";')

      const files = getIOSWidgetExtensionFiles(dir, 'Target')
      expect(files.localizedStringResources.sort()).toEqual([
        'en.lproj/Localizable.strings',
        'fr.lproj/Localizable.strings',
        'pl.lproj/Localizable.strings',
      ])
    })
  })

  it('removes files and folders of languages that are no longer declared', () => {
    withTempDir((dir) => {
      syncExtensionLocalizableStrings(dir, ['en', 'de'], [weather])
      fs.writeFileSync(path.join(dir, 'en.lproj', 'VoltraWidgets.strings'), '/* gallery */\n')

      syncExtensionLocalizableStrings(dir, ['en'], [])

      expect(fs.existsSync(path.join(dir, 'de.lproj'))).toBe(false)
      expect(fs.readFileSync(path.join(dir, 'en.lproj', 'Localizable.strings'), 'utf8')).toBe(
        '/* Voltra widget extension strings (auto-generated) */\n'
      )
      expect(fs.existsSync(path.join(dir, 'en.lproj', 'VoltraWidgets.strings'))).toBe(true)
    })
  })
})

describe('generateInfoPlist localizations', () => {
  it('declares CFBundleLocalizations only when there are languages', () => {
    withTempDir((dir) => {
      generateInfoPlist(dir, 'Ext', '1.0.0', '1', '2.0.0', ['en', 'pl'])
      const plist = fs.readFileSync(path.join(dir, 'Info.plist'), 'utf8')
      expect(plist).toContain(
        '<key>CFBundleLocalizations</key>\n\t<array>\n\t\t<string>en</string>\n\t\t<string>pl</string>\n\t</array>'
      )

      generateInfoPlist(dir, 'Ext', '1.0.0', '1', '2.0.0', [])
      expect(fs.readFileSync(path.join(dir, 'Info.plist'), 'utf8')).not.toContain('CFBundleLocalizations')
    })
  })
})
