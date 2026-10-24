import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, test } from 'node:test'

import { ensureAndroidManifest } from './manifest.ts'

import type { NormalizedVoltraAndroidConfig } from '../../config/types.ts'

const SERVICE = 'voltra.ongoingnotification.VoltraOngoingNotificationService'

function manifestXml(applicationChildren = '', permissions = ''): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.INTERNET"/>${permissions}
  <application android:name=".MainApplication">
    <activity android:name=".MainActivity" android:exported="true"/>${applicationChildren}
  </application>
</manifest>
`
}

describe('ensureAndroidManifest ongoing notification foreground service', () => {
  let tempDir: string
  let manifestPath: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-cli-manifest-'))
    manifestPath = path.join(tempDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml')
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  async function apply(
    ongoingNotificationForegroundService?: NormalizedVoltraAndroidConfig['ongoingNotificationForegroundService']
  ) {
    const result = await ensureAndroidManifest({
      projectRoot: tempDir,
      android: {
        enableNotifications: true,
        ongoingNotificationForegroundService,
        widgets: [],
        fonts: [],
        userImagesPath: path.join(tempDir, 'assets', 'voltra-android'),
        project: {},
      },
      discovery: {
        androidRoot: path.join(tempDir, 'android'),
        appModuleName: 'app',
        appModuleRoot: path.join(tempDir, 'android', 'app'),
        manifestPath,
        buildGradlePath: path.join(tempDir, 'android', 'app', 'build.gradle'),
        packageName: 'com.example.app',
      },
    })
    return { result, manifest: fs.readFileSync(manifestPath, 'utf8') }
  }

  function count(content: string, needle: string): number {
    return content.split(needle).length - 1
  }

  test('declares the service and its permissions, and a second apply changes nothing', async () => {
    fs.writeFileSync(manifestPath, manifestXml())

    const first = await apply({ types: ['location', 'dataSync'] })
    assert.ok(first.result.change)
    assert.equal(count(first.manifest, '"android.permission.FOREGROUND_SERVICE"'), 1)
    assert.equal(count(first.manifest, '"android.permission.FOREGROUND_SERVICE_LOCATION"'), 1)
    assert.equal(count(first.manifest, '"android.permission.FOREGROUND_SERVICE_DATA_SYNC"'), 1)
    assert.equal(count(first.manifest, `<service android:name="${SERVICE}"`), 1)
    assert.ok(first.manifest.includes('android:exported="false" android:foregroundServiceType="location|dataSync"/>'))
    assert.ok(!first.manifest.includes('ACCESS_FINE_LOCATION'))

    const second = await apply({ types: ['location', 'dataSync'] })
    assert.equal(second.result.change, undefined)
    assert.equal(second.manifest, first.manifest)
  })

  test('writes the special use subtype property', async () => {
    fs.writeFileSync(manifestPath, manifestXml())

    const { manifest } = await apply({ types: ['specialUse'], specialUseSubtype: 'Live delivery progress' })

    assert.ok(manifest.includes('"android.permission.FOREGROUND_SERVICE_SPECIAL_USE"'))
    assert.ok(
      manifest.includes(
        '<property android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE" android:value="Live delivery progress"/>'
      )
    )
  })

  test('adds nothing without the key', async () => {
    fs.writeFileSync(manifestPath, manifestXml())

    const { manifest } = await apply()

    assert.ok(!manifest.includes('FOREGROUND_SERVICE'))
    assert.ok(!manifest.includes('<service'))
  })

  // A library service merged in at build time may need the same permissions, so they stay.
  test('removes the service but keeps its permissions when the key is removed', async () => {
    fs.writeFileSync(manifestPath, manifestXml())
    await apply({ types: ['location', 'dataSync'] })

    const { manifest } = await apply()

    assert.ok(!manifest.includes('<service'))
    assert.equal(count(manifest, '"android.permission.FOREGROUND_SERVICE"'), 1)
    assert.equal(count(manifest, '"android.permission.FOREGROUND_SERVICE_LOCATION"'), 1)
    assert.equal(count(manifest, '"android.permission.FOREGROUND_SERVICE_DATA_SYNC"'), 1)
    assert.ok(manifest.includes('"android.permission.INTERNET"'))
  })

  test('narrows the service types and keeps the dropped type permission when the type set shrinks', async () => {
    fs.writeFileSync(manifestPath, manifestXml())
    await apply({ types: ['location', 'dataSync'] })

    const { manifest } = await apply({ types: ['location'] })

    assert.ok(manifest.includes('android:foregroundServiceType="location"/>'))
    assert.equal(count(manifest, '"android.permission.FOREGROUND_SERVICE_DATA_SYNC"'), 1)
  })

  test('keeps permissions that an app service still declares', async () => {
    fs.writeFileSync(
      manifestPath,
      manifestXml(
        '\n    <service android:name=".TrackingService" android:foregroundServiceType="location"/>',
        '\n  <uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>\n  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION"/>'
      )
    )
    await apply({ types: ['location', 'dataSync'] })

    const { manifest } = await apply()

    assert.equal(count(manifest, '"android.permission.FOREGROUND_SERVICE"'), 1)
    assert.equal(count(manifest, '"android.permission.FOREGROUND_SERVICE_LOCATION"'), 1)
    assert.ok(manifest.includes('<service android:name=".TrackingService"'))
    assert.ok(!manifest.includes(SERVICE))
  })
})
