import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { getDynamicLiveActivityAttributesType } from '@use-voltra/expo-plugin'

import { validateIOSConfigPluginProps } from './validation'

function createProjectRoot(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'voltra-ios-validation-'))

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(root, relativePath)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, contents)
  }

  return root
}

describe('validateIOSConfigPluginProps', () => {
  it('accepts valid groupIdentifier', () => {
    expect(() =>
      validateIOSConfigPluginProps({
        groupIdentifier: 'group.com.example.app',
      })
    ).not.toThrow()
  })

  it('rejects groupIdentifier without group. prefix', () => {
    expect(() =>
      validateIOSConfigPluginProps({
        groupIdentifier: 'com.example.app',
      })
    ).toThrow(/must start with 'group.'/)
  })

  it('accepts legacy widgets without an entry', () => {
    expect(() =>
      validateIOSConfigPluginProps({
        widgets: [
          {
            id: 'home',
            displayName: 'Home',
            description: 'Home widget',
          },
        ],
      })
    ).not.toThrow()
  })

  it('requires a valid widget entry when present and resolves it against the project root', () => {
    const projectRoot = createProjectRoot({
      'widgets/home.tsx': 'export default function HomeWidget() {}',
    })

    try {
      expect(() =>
        validateIOSConfigPluginProps(
          {
            widgets: [
              {
                id: 'home',
                entry: './widgets/home.tsx',
                displayName: 'Home',
                description: 'Home widget',
              },
            ],
          },
          projectRoot
        )
      ).not.toThrow()
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  it('rejects invalid widget entries when present', () => {
    const projectRoot = createProjectRoot({})

    try {
      expect(() =>
        validateIOSConfigPluginProps(
          {
            widgets: [
              {
                id: 'home',
                entry: './widgets/missing.tsx',
                displayName: 'Home',
                description: 'Home widget',
              },
            ],
          },
          projectRoot
        )
      ).toThrow(/Widget 'home': entry file not found at widgets\/missing\.tsx/)
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  it('accepts Dynamic Live Activities independently from widget IDs', () => {
    const projectRoot = createProjectRoot({
      'widgets/order-finished.tsx': 'export default function OrderFinished() {}',
      'live-activities/order-finished.tsx': 'export default function OrderFinished() {}',
    })

    try {
      expect(() =>
        validateIOSConfigPluginProps(
          {
            groupIdentifier: 'group.com.example.app',
            widgets: [
              {
                id: 'order_finished',
                entry: './widgets/order-finished.tsx',
                displayName: 'Order finished',
                description: 'Order status',
              },
            ],
            liveActivities: [{ id: 'order_finished', entry: './live-activities/order-finished.tsx' }],
          },
          projectRoot
        )
      ).not.toThrow()
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  it('requires an App Group for Dynamic Live Activities', () => {
    expect(() =>
      validateIOSConfigPluginProps({
        liveActivities: [{ id: 'order_finished', entry: './live-activities/order-finished.tsx' }],
      })
    ).toThrow(/groupIdentifier is required when liveActivities is non-empty/)
  })

  it.each(['', 'order-finished', 'order finished', 'order.finished'])(
    'rejects invalid Dynamic Live Activity ID %p',
    (id) => {
      expect(() =>
        validateIOSConfigPluginProps({
          groupIdentifier: 'group.com.example.app',
          liveActivities: [{ id, entry: './live-activities/order-finished.tsx' }],
        })
      ).toThrow(/Dynamic Live Activity ID/)
    }
  )

  it.each([
    ['./live-activities/order-finished.txt', /Metro-importable source extension/],
    ['../live-activities/order-finished.tsx', /must stay within the project root/],
  ])('rejects invalid Dynamic Live Activity entry %p', (entry, error) => {
    expect(() =>
      validateIOSConfigPluginProps({
        groupIdentifier: 'group.com.example.app',
        liveActivities: [{ id: 'order_finished', entry }],
      })
    ).toThrow(error)
  })

  it('rejects duplicate Dynamic Live Activity IDs', () => {
    expect(() =>
      validateIOSConfigPluginProps({
        groupIdentifier: 'group.com.example.app',
        liveActivities: [
          { id: 'order_finished', entry: './live-activities/order-finished.tsx' },
          { id: 'order_finished', entry: './live-activities/order-finished-v2.tsx' },
        ],
      })
    ).toThrow(/Duplicate Dynamic Live Activity ID/)
  })

  it('rejects IDs that generate the same ActivityKit attributes type', () => {
    expect(() =>
      validateIOSConfigPluginProps({
        groupIdentifier: 'group.com.example.app',
        liveActivities: [
          { id: 'order_finished', entry: './live-activities/order-finished.tsx' },
          { id: 'order__finished', entry: './live-activities/order-finished-v2.tsx' },
        ],
      })
    ).toThrow(/generate the same ActivityKit attributes type/)
  })

  it('uses the public naming helper for generated attributes types', () => {
    expect(getDynamicLiveActivityAttributesType('order_finished')).toBe('VoltraOrderFinishedLiveActivityAttributes')
    expect(getDynamicLiveActivityAttributesType('order__finished')).toBe('VoltraOrderFinishedLiveActivityAttributes')
  })
})
