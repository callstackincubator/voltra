import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { generateInfoPlist } from './infoPlist'

describe('generateInfoPlist', () => {
  it('records the installed Voltra version for the renderer environment', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-plist-'))
    try {
      generateInfoPlist(directory, 'ExampleLiveActivity', '1.0.0', '42', '2.2.0')

      const plist = fs.readFileSync(path.join(directory, 'Info.plist'), 'utf8')
      expect(plist).toContain('<key>Voltra_Version</key>')
      expect(plist).toContain('<string>2.2.0</string>')
    } finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })
})
