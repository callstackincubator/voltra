import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { generateInfoPlist } from './infoPlist'

describe('generateInfoPlist', () => {
  it('records the installed Voltra version separately from the app version', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-plist-'))
    try {
      generateInfoPlist(directory, 'ExampleLiveActivity', '1.2.3', '42', '9.8.7')

      const plist = fs.readFileSync(path.join(directory, 'Info.plist'), 'utf8')
      expect(plist).toContain('<key>CFBundleShortVersionString</key>\n\t<string>1.2.3</string>')
      expect(plist).toContain('<key>Voltra_Version</key>\n\t<string>9.8.7</string>')
    } finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })
})
