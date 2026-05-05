import { __test__ } from './swift'

describe('generateInitialStatesSwift', () => {
  it('embeds the locale helper into generated initial states Swift', () => {
    const swift = __test__.generateInitialStatesSwift(
      new Map([
        [
          'weather',
          new Map([
            ['en-US', '{"ok":true}'],
            ['pl', '{"ok":false}'],
          ]),
        ],
      ])
    )

    expect(swift).toContain('private enum VoltraGeneratedInitialStateLocale')
    expect(swift).toContain('VoltraGeneratedInitialStateLocale.preferredLanguageTags()')
    expect(swift).toContain('VoltraGeneratedInitialStateLocale.pickJson(from: perLocale, preferredLanguages: tags)')
    expect(swift).not.toContain('VoltraInitialStateLocale.preferredLanguageTags()')
  })
})
