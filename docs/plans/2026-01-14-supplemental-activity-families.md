# Supplemental Activity Families Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add support for Apple's `supplementalActivityFamilies` modifier (iOS 18+) to enable Live Activities on watchOS Smart Stack and CarPlay.

**Architecture:** Extend the existing Live Activity system with an optional supplemental variant. The TypeScript side gets a new optional slot (`supplemental.small`), the Swift side adds the `.supplementalActivityFamilies()` modifier with `@Environment(\.activityFamily)` detection to render appropriate content (falling back to `lockScreen` when not provided), and the plugin generates Swift code only when explicitly configured via `liveActivity.supplementalFamilies`.

**Key Design Decisions:**

- **Opt-in required**: Developer must explicitly enable via plugin config `liveActivity.supplementalFamilies: ["small"]`
- **Only `.small` supported**: No `supplemental.medium` in TypeScript API (`.medium` is the default iPhone lock screen)
- **Graceful fallback**: If `supplemental.small` not provided in variants, automatically uses `lockScreen` content

**Tech Stack:** TypeScript (types, renderer, API), Swift (VoltraWidget, VoltraRegion), Expo config plugin (code generation)

---

## Background: Apple's supplementalActivityFamilies API

### API Reference

```swift
// iOS 18+ only
@MainActor @preconcurrency
func supplementalActivityFamilies(_ families: [ActivityFamily]) -> some WidgetConfiguration
```

### ActivityFamily Enum Values

- `.small` - Used for Apple Watch Smart Stack and CarPlay (compact view) - **requires opt-in**
- `.medium` - iPhone Lock Screen (default behavior, no configuration needed)

### Environment Variable

```swift
@available(iOS 18.0, *)
@Environment(\.activityFamily) private var activityFamily

// Values: .small, .medium
// Defaults to .medium on iPhone lock screen
```

### Real-World Pattern (from LoopKit/Loop)

```swift
@available(iOS 16.2, *)
struct GlucoseLiveActivityConfiguration: Widget {
    var body: some WidgetConfiguration {
        if #available(iOS 18.0, *) {
            return ActivityConfiguration(for: Attributes.self) { context in
                AdaptiveLockScreenView(context: context)  // Uses @Environment
            } dynamicIsland: { ... }
            .supplementalActivityFamilies([.small])
        } else {
            return ActivityConfiguration(for: Attributes.self) { context in
                FullLockScreenView(context: context)
            } dynamicIsland: { ... }
        }
    }
}

@available(iOS 18.0, *)
struct AdaptiveLockScreenView: View {
    let context: ActivityViewContext<Attributes>
    @Environment(\.activityFamily) private var activityFamily

    var body: some View {
        if activityFamily == .small {
            CompactView(context: context)  // watchOS/CarPlay
        } else {
            FullView(context: context)     // iPhone lock screen
        }
    }
}
```

---

## Architecture Decision: Simplified `supplemental.small` with Fallback

**Rationale:**

- **Opt-in required**: Supplemental families only enabled when explicitly configured in plugin
- **Single slot**: Only `supplemental.small` needed (`.medium` is default iPhone lock screen behavior)
- **Graceful fallback**: If `supplemental.small` not provided, uses `lockScreen` content automatically
- Follows existing Voltra patterns (like `island` being separate from `lockScreen`)

```typescript
// TypeScript API
type LiveActivityVariants = {
  lockScreen?: ReactNode | { content?: ReactNode; activityBackgroundTint?: string }
  island?: {
    /* existing */
  }
  // NEW: iOS 18+ supplemental families (optional)
  supplemental?: {
    small?: ReactNode // watchOS Smart Stack, CarPlay - falls back to lockScreen if not provided
  }
}

// Plugin config (app.json) - REQUIRED to enable
;[
  'voltra',
  {
    groupIdentifier: 'group.com.example',
    liveActivity: {
      supplementalFamilies: ['small'], // Explicit opt-in
    },
  },
]
```

---

## Implementation Tasks

### Task 1: Add TypeScript Types for Supplemental Families

**Files:**

- Modify: `src/live-activity/types.ts:8-48`

**Step 1: Add supplemental region to LiveActivityVariants type**

In `src/live-activity/types.ts`, add the `supplemental` property to `LiveActivityVariants`:

```typescript
/**
 * Live Activity variants - defines content for different states
 */
export type LiveActivityVariants = {
  lockScreen?:
    | ReactNode
    | {
        content?: ReactNode
        activityBackgroundTint?: string
      }
  island?: {
    keylineTint?: string
    expanded?: {
      center?: ReactNode
      leading?: ReactNode
      trailing?: ReactNode
      bottom?: ReactNode
    }
    compact?: {
      leading?: ReactNode
      trailing?: ReactNode
    }
    minimal?: ReactNode
  }
  /**
   * Supplemental activity families for iOS 18+ (watchOS Smart Stack, CarPlay)
   * Requires plugin config: liveActivity.supplementalFamilies: ["small"]
   */
  supplemental?: {
    /**
     * Compact view for watchOS Smart Stack and CarPlay (iOS 26+)
     * Should be a simplified version of the lock screen UI
     * Falls back to lockScreen content if not provided
     */
    small?: ReactNode
  }
}
```

**Step 2: Add JSON keys to LiveActivityVariantsJson type**

Add the new JSON key for supplemental small region:

```typescript
/**
 * Rendered Live Activity variants to JSON.
 */
export type LiveActivityVariantsJson = {
  v: number // Payload version - required for remote updates
  s?: Record<string, unknown>[] // Shared stylesheet for all variants
  e?: VoltraNodeJson[] // Shared elements for deduplication
  ls?: VoltraNodeJson
  ls_background_tint?: string
  isl_keyline_tint?: string
  isl_exp_c?: VoltraNodeJson
  isl_exp_l?: VoltraNodeJson
  isl_exp_t?: VoltraNodeJson
  isl_exp_b?: VoltraNodeJson
  isl_cmp_l?: VoltraNodeJson
  isl_cmp_t?: VoltraNodeJson
  isl_min?: VoltraNodeJson
  // NEW: Supplemental activity families (iOS 18+)
  saf_sm?: VoltraNodeJson // supplemental.small
}
```

**Step 3: Verify types compile**

Run: `npm run typecheck`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/live-activity/types.ts
git commit -m "feat(types): add supplemental activity families to LiveActivityVariants"
```

---

### Task 2: Update Renderer to Handle Supplemental Regions

**Files:**

- Modify: `src/live-activity/renderer.ts:10-73`

**Step 1: Add supplemental region rendering**

In `renderLiveActivityToJson`, add handling for supplemental variants after the island variants:

```typescript
export const renderLiveActivityToJson = (variants: LiveActivityVariants): LiveActivityJson => {
  const renderer = createVoltraRenderer()

  // Add lock screen variant (existing code)
  if (variants.lockScreen) {
    const lockScreenVariant = variants.lockScreen
    if (typeof lockScreenVariant === 'object' && lockScreenVariant !== null && 'content' in lockScreenVariant) {
      if (lockScreenVariant.content) {
        renderer.addRootNode('ls', lockScreenVariant.content)
      }
    } else {
      renderer.addRootNode('ls', lockScreenVariant as ReactNode)
    }
  }

  // Add island variants (existing code - unchanged)
  if (variants.island) {
    if (variants.island.expanded) {
      if (variants.island.expanded.center) {
        renderer.addRootNode('isl_exp_c', variants.island.expanded.center)
      }
      if (variants.island.expanded.leading) {
        renderer.addRootNode('isl_exp_l', variants.island.expanded.leading)
      }
      if (variants.island.expanded.trailing) {
        renderer.addRootNode('isl_exp_t', variants.island.expanded.trailing)
      }
      if (variants.island.expanded.bottom) {
        renderer.addRootNode('isl_exp_b', variants.island.expanded.bottom)
      }
    }
    if (variants.island.compact) {
      if (variants.island.compact.leading) {
        renderer.addRootNode('isl_cmp_l', variants.island.compact.leading)
      }
      if (variants.island.compact.trailing) {
        renderer.addRootNode('isl_cmp_t', variants.island.compact.trailing)
      }
    }
    if (variants.island.minimal) {
      renderer.addRootNode('isl_min', variants.island.minimal)
    }
  }

  // NEW: Add supplemental activity family variants (iOS 18+)
  if (variants.supplemental) {
    if (variants.supplemental.small) {
      renderer.addRootNode('saf_sm', variants.supplemental.small)
    }
  }

  // Render all variants
  const result = renderer.render() as LiveActivityJson

  // Add non-JSX properties after rendering (existing code - unchanged)
  if (
    variants.lockScreen &&
    typeof variants.lockScreen === 'object' &&
    'activityBackgroundTint' in variants.lockScreen
  ) {
    if (variants.lockScreen.activityBackgroundTint) {
      result.ls_background_tint = variants.lockScreen.activityBackgroundTint
    }
  }

  if (variants.island?.keylineTint) {
    result.isl_keyline_tint = variants.island.keylineTint
  }

  return result
}
```

**Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/live-activity/renderer.ts
git commit -m "feat(renderer): add supplemental family region rendering"
```

---

### Task 3: Add Swift VoltraRegion Cases for Supplemental Families

**Files:**

- Modify: `ios/shared/VoltraRegion.swift:3-34`

**Step 1: Add new enum cases**

Add the supplemental family cases to `VoltraRegion`:

```swift
import Foundation

public enum VoltraRegion: String, Codable, Hashable, CaseIterable {
  case lockScreen
  case islandExpandedCenter
  case islandExpandedLeading
  case islandExpandedTrailing
  case islandExpandedBottom
  case islandCompactLeading
  case islandCompactTrailing
  case islandMinimal
  // NEW: Supplemental activity families (iOS 18+)
  case supplementalSmall

  /// The JSON key for this region in the payload
  public var jsonKey: String {
    switch self {
    case .lockScreen:
      return "ls"
    case .islandExpandedCenter:
      return "isl_exp_c"
    case .islandExpandedLeading:
      return "isl_exp_l"
    case .islandExpandedTrailing:
      return "isl_exp_t"
    case .islandExpandedBottom:
      return "isl_exp_b"
    case .islandCompactLeading:
      return "isl_cmp_l"
    case .islandCompactTrailing:
      return "isl_cmp_t"
    case .islandMinimal:
      return "isl_min"
    // NEW: Supplemental families
    case .supplementalSmall:
      return "saf_sm"
    }
  }
}
```

**Step 2: Build iOS to verify Swift compiles**

Run: `cd example && npx expo prebuild --clean && xcodebuild -workspace ios/*.xcworkspace -scheme ExampleApp -destination 'platform=iOS Simulator,name=iPhone 15' build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add ios/shared/VoltraRegion.swift
git commit -m "feat(swift): add supplemental family cases to VoltraRegion"
```

---

### Task 4: Update VoltraWidget.swift with Supplemental Families Support

**Files:**

- Modify: `ios/target/VoltraWidget.swift:1-64`

**Step 1: Create complete updated VoltraWidget.swift**

Replace the entire file with iOS 18+ support. Note: The `.supplementalActivityFamilies()` modifier is NOT applied here - it will be applied by the generated wrapper in the widget bundle (only when configured via plugin).

```swift
import ActivityKit
import Foundation
import SwiftUI
import WidgetKit

public struct VoltraWidget: Widget {
  public init() {}

  /// Convert an array of nodes to a single root node for rendering
  private func rootNode(for region: VoltraRegion, from state: VoltraAttributes.ContentState) -> VoltraNode {
    let nodes = state.regions[region] ?? []
    if nodes.isEmpty { return .empty }
    return nodes.count == 1 ? nodes[0] : .array(nodes)
  }

  public var body: some WidgetConfiguration {
    if #available(iOS 18.0, *) {
      return ios18Configuration()
    } else {
      return legacyConfiguration()
    }
  }

  // MARK: - iOS 18+ Configuration (with adaptive view for supplemental families)

  @available(iOS 18.0, *)
  private func ios18Configuration() -> some WidgetConfiguration {
    ActivityConfiguration(for: VoltraAttributes.self) { context in
      VoltraAdaptiveLockScreenView(
        context: context,
        rootNodeProvider: rootNode
      )
      .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
      .voltraIfLet(context.state.activityBackgroundTint) { view, tint in
        let color = JSColorParser.parse(tint)
        view.activityBackgroundTint(color)
      }
    } dynamicIsland: { context in
      dynamicIslandContent(context: context)
    }
    // NOTE: .supplementalActivityFamilies() is applied by VoltraWidgetWithSupplementalFamilies
    // wrapper when configured via plugin (see VoltraWidgetBundle.swift)
  }

  // MARK: - Legacy Configuration (iOS 16.2 - 17.x)

  private func legacyConfiguration() -> some WidgetConfiguration {
    ActivityConfiguration(for: VoltraAttributes.self) { context in
      Voltra(root: rootNode(for: .lockScreen, from: context.state), activityId: context.activityID)
        .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
        .voltraIfLet(context.state.activityBackgroundTint) { view, tint in
          let color = JSColorParser.parse(tint)
          view.activityBackgroundTint(color)
        }
    } dynamicIsland: { context in
      dynamicIslandContent(context: context)
    }
  }

  // MARK: - Dynamic Island (shared between iOS versions)

  private func dynamicIslandContent(context: ActivityViewContext<VoltraAttributes>) -> DynamicIsland {
    let dynamicIsland = DynamicIsland {
      DynamicIslandExpandedRegion(.leading) {
        Voltra(root: rootNode(for: .islandExpandedLeading, from: context.state), activityId: context.activityID)
          .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
      }
      DynamicIslandExpandedRegion(.trailing) {
        Voltra(root: rootNode(for: .islandExpandedTrailing, from: context.state), activityId: context.activityID)
          .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
      }
      DynamicIslandExpandedRegion(.center) {
        Voltra(root: rootNode(for: .islandExpandedCenter, from: context.state), activityId: context.activityID)
          .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
      }
      DynamicIslandExpandedRegion(.bottom) {
        Voltra(root: rootNode(for: .islandExpandedBottom, from: context.state), activityId: context.activityID)
          .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
      }
    } compactLeading: {
      Voltra(root: rootNode(for: .islandCompactLeading, from: context.state), activityId: context.activityID)
        .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
    } compactTrailing: {
      Voltra(root: rootNode(for: .islandCompactTrailing, from: context.state), activityId: context.activityID)
        .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
    } minimal: {
      Voltra(root: rootNode(for: .islandMinimal, from: context.state), activityId: context.activityID)
        .widgetURL(VoltraDeepLinkResolver.resolve(context.attributes))
    }

    // Apply keylineTint if specified
    if let keylineTint = context.state.keylineTint,
       let color = JSColorParser.parse(keylineTint)
    {
      return dynamicIsland.keylineTint(color)
    } else {
      return dynamicIsland
    }
  }
}

// MARK: - Adaptive Lock Screen View (iOS 18+)

/// A view that adapts its content based on the activity family environment
/// - For .small (watchOS/CarPlay): Uses supplementalSmall content if available, falls back to lockScreen
/// - For .medium (iPhone lock screen) and unknown: Always uses lockScreen
@available(iOS 18.0, *)
struct VoltraAdaptiveLockScreenView: View {
  let context: ActivityViewContext<VoltraAttributes>
  let rootNodeProvider: (VoltraRegion, VoltraAttributes.ContentState) -> VoltraNode

  @Environment(\.activityFamily) private var activityFamily

  var body: some View {
    switch activityFamily {
    case .small:
      // watchOS Smart Stack / CarPlay: prefer supplementalSmall, fallback to lockScreen
      let region: VoltraRegion = context.state.regions[.supplementalSmall] != nil
        ? .supplementalSmall
        : .lockScreen
      Voltra(root: rootNodeProvider(region, context.state), activityId: context.activityID)

    case .medium, @unknown default:
      // iPhone lock screen: always use lockScreen
      Voltra(root: rootNodeProvider(.lockScreen, context.state), activityId: context.activityID)
    }
  }
}
```

**Step 2: Verify Swift compiles**

Run: `cd ios && swift build` (or use Xcode build)
Expected: No compilation errors

**Step 3: Commit**

```bash
git add ios/target/VoltraWidget.swift
git commit -m "feat(swift): add iOS 18 supplementalActivityFamilies support with adaptive view"
```

---

### Task 5: Add Plugin Configuration Types for Activity Families

**Files:**

- Modify: `plugin/src/types/widget.ts:1-57`
- Create: `plugin/src/types/activity.ts`

**Step 1: Create new activity types file**

Create `plugin/src/types/activity.ts`:

```typescript
/**
 * Activity-related type definitions for Live Activities
 */

/**
 * Supported supplemental activity families (iOS 18+)
 * These enable Live Activities to appear on watchOS Smart Stack and CarPlay
 */
export type ActivityFamily = 'small'

/**
 * Configuration for Live Activity supplemental families
 */
export interface LiveActivityConfig {
  /**
   * Supplemental activity families to enable (iOS 18+)
   * - 'small': Compact view for watchOS Smart Stack and CarPlay
   *
   * When configured, the .supplementalActivityFamilies() modifier is applied
   * to the ActivityConfiguration with availability check for iOS 18.0+
   */
  supplementalFamilies?: ActivityFamily[]
}
```

**Step 2: Export from types/index.ts**

Update `plugin/src/types/index.ts` to export the new types:

```typescript
export * from './plugin'
export * from './widget'
export * from './activity'
```

**Step 3: Add to ConfigPluginProps**

Update `plugin/src/types/plugin.ts` to include live activity config:

```typescript
import { ConfigPlugin } from '@expo/config-plugins'

import type { WidgetConfig } from './widget'
import type { LiveActivityConfig } from './activity'

/**
 * Props for the Voltra config plugin
 */
export interface ConfigPluginProps {
  /**
   * Enable push notification support for Live Activities
   */
  enablePushNotifications?: boolean
  /**
   * App group identifier for sharing data between app and widget extension
   */
  groupIdentifier: string
  /**
   * Configuration for home screen widgets
   * Each widget will be available in the widget gallery
   */
  widgets?: WidgetConfig[]
  /**
   * Configuration for Live Activities (iOS 18+ features)
   */
  liveActivity?: LiveActivityConfig
  /**
   * iOS deployment target version for the widget extension
   * If not provided, will use the main app's deployment target or fall back to the default
   */
  deploymentTarget?: string
}

// ... rest unchanged
```

**Step 4: Verify types compile**

Run: `cd plugin && npm run typecheck`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add plugin/src/types/activity.ts plugin/src/types/index.ts plugin/src/types/plugin.ts
git commit -m "feat(plugin): add ActivityFamily types for supplemental families config"
```

---

### Task 6: Add Constants for Activity Family Mapping

**Files:**

- Create: `plugin/src/constants/activities.ts`
- Modify: `plugin/src/constants/index.ts`

**Step 1: Create activity constants file**

Create `plugin/src/constants/activities.ts`:

```typescript
import type { ActivityFamily } from '../types'

/**
 * Activity-related constants for the Voltra plugin
 */

/** Default supplemental activity families when not specified */
export const DEFAULT_ACTIVITY_FAMILIES: ActivityFamily[] = ['small']

/** Maps JS activity family names to SwiftUI ActivityFamily enum cases */
export const ACTIVITY_FAMILY_MAP: Record<ActivityFamily, string> = {
  small: '.small',
}
```

**Step 2: Export from constants/index.ts**

Update `plugin/src/constants/index.ts`:

```typescript
export * from './ios'
export * from './paths'
export * from './widgets'
export * from './activities'
```

**Step 3: Verify types compile**

Run: `cd plugin && npm run typecheck`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add plugin/src/constants/activities.ts plugin/src/constants/index.ts
git commit -m "feat(plugin): add activity family constants and Swift mapping"
```

---

### Task 7: Add Validation for Activity Families

**Files:**

- Create: `plugin/src/validation/validateActivity.ts`
- Modify: `plugin/src/validation/index.ts`

**Step 1: Create activity validation file**

Create `plugin/src/validation/validateActivity.ts`:

```typescript
import type { ActivityFamily, LiveActivityConfig } from '../types'

const VALID_ACTIVITY_FAMILIES: Set<ActivityFamily> = new Set(['small'])

/**
 * Validates a Live Activity configuration.
 * Throws an error if validation fails.
 */
export function validateLiveActivityConfig(config: LiveActivityConfig | undefined): void {
  if (!config) return

  // Validate supplemental families if provided
  if (config.supplementalFamilies) {
    if (!Array.isArray(config.supplementalFamilies)) {
      throw new Error('liveActivity.supplementalFamilies must be an array')
    }

    if (config.supplementalFamilies.length === 0) {
      throw new Error(
        'liveActivity.supplementalFamilies cannot be empty. ' +
          'Either provide families or remove the property to disable supplemental families.'
      )
    }

    for (const family of config.supplementalFamilies) {
      if (!VALID_ACTIVITY_FAMILIES.has(family)) {
        throw new Error(
          `Invalid activity family '${family}'. ` +
            `Valid families are: ${Array.from(VALID_ACTIVITY_FAMILIES).join(', ')}`
        )
      }
    }
  }
}
```

**Step 2: Update validation/index.ts**

Update `plugin/src/validation/index.ts`:

```typescript
export * from './validateProps'
export * from './validateWidget'
export * from './validateActivity'
```

**Step 3: Update validateProps.ts to include activity validation**

In `plugin/src/validation/validateProps.ts`, add:

```typescript
import type { ConfigPluginProps } from '../types'
import { validateWidgetConfig } from './validateWidget'
import { validateLiveActivityConfig } from './validateActivity'

export function validateProps(props: ConfigPluginProps | undefined): void {
  if (!props) {
    throw new Error(
      'Voltra plugin requires configuration. Please provide at least groupIdentifier in your plugin config.'
    )
  }

  if (!props.groupIdentifier || typeof props.groupIdentifier !== 'string') {
    throw new Error('groupIdentifier is required and must be a string')
  }

  // Validate widgets
  if (props.widgets) {
    for (const widget of props.widgets) {
      validateWidgetConfig(widget)
    }
  }

  // Validate live activity config
  if (props.liveActivity) {
    validateLiveActivityConfig(props.liveActivity)
  }
}
```

**Step 4: Verify types compile**

Run: `cd plugin && npm run typecheck`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add plugin/src/validation/validateActivity.ts plugin/src/validation/index.ts plugin/src/validation/validateProps.ts
git commit -m "feat(plugin): add validation for supplemental activity families"
```

---

### Task 8: Update Widget Bundle Generator for Supplemental Families

**Files:**

- Modify: `plugin/src/features/ios/files/swift/widgetBundle.ts:44-106`

**Step 1: Update generateDefaultWidgetBundleSwift**

Update the function to accept activity family configuration:

```typescript
import dedent from 'dedent'

import {
  DEFAULT_WIDGET_FAMILIES,
  WIDGET_FAMILY_MAP,
  DEFAULT_ACTIVITY_FAMILIES,
  ACTIVITY_FAMILY_MAP,
} from '../../../../constants'
import type { WidgetConfig, ActivityFamily } from '../../../../types'

// ... generateWidgetStruct function unchanged ...

/**
 * Generates the VoltraWidgetBundle.swift file content with configured widgets
 */
export function generateWidgetBundleSwift(widgets: WidgetConfig[], supplementalFamilies?: ActivityFamily[]): string {
  // Generate widget structs
  const widgetStructs = widgets.map(generateWidgetStruct).join('\n\n')

  // Generate widget bundle body entries
  const widgetInstances = widgets.map((w) => `    VoltraWidget_${w.id}()`).join('\n')

  // Generate supplemental families Swift code
  const familiesSwift = generateSupplementalFamiliesSwift(supplementalFamilies)

  return dedent`
    //
    //  VoltraWidgetBundle.swift
    //
    //  Auto-generated by Voltra config plugin.
    //  This file defines which Voltra widgets are available in your app.
    //

    import SwiftUI
    import WidgetKit
    import VoltraWidget

    @main
    struct VoltraWidgetBundle: WidgetBundle {
      var body: some Widget {
        // Live Activity Widget (Dynamic Island + Lock Screen)
        ${familiesSwift ? `VoltraWidgetWithSupplementalFamilies()` : 'VoltraWidget()'}

        // Home Screen Widgets
    ${widgetInstances}
      }
    }

    ${familiesSwift ? generateVoltraWidgetWrapper(familiesSwift) : ''}

    // MARK: - Home Screen Widget Definitions

    ${widgetStructs}
  `
}

/**
 * Generates the VoltraWidgetBundle.swift file content when no widgets are configured
 * (only Live Activities)
 */
export function generateDefaultWidgetBundleSwift(supplementalFamilies?: ActivityFamily[]): string {
  const familiesSwift = generateSupplementalFamiliesSwift(supplementalFamilies)

  return dedent`
    //
    //  VoltraWidgetBundle.swift
    //
    //  This file defines which Voltra widgets are available in your app.
    //  You can customize which widgets to include by adding or removing them below.
    //

    import SwiftUI
    import WidgetKit
    import VoltraWidget  // Import Voltra widgets

    @main
    struct VoltraWidgetBundle: WidgetBundle {
      var body: some Widget {
        // Live Activity Widget (Dynamic Island + Lock Screen)
        ${familiesSwift ? `VoltraWidgetWithSupplementalFamilies()` : 'VoltraWidget()'}
      }
    }

    ${familiesSwift ? generateVoltraWidgetWrapper(familiesSwift) : ''}
  `
}

/**
 * Generate Swift array literal for supplemental families
 */
function generateSupplementalFamiliesSwift(families?: ActivityFamily[]): string | null {
  if (!families || families.length === 0) {
    return null
  }
  return families.map((f) => ACTIVITY_FAMILY_MAP[f]).join(', ')
}

/**
 * Generate a wrapper widget that applies supplementalActivityFamilies
 */
function generateVoltraWidgetWrapper(familiesSwift: string): string {
  return dedent`
    // MARK: - Live Activity with Supplemental Families

    /// Wrapper that applies supplementalActivityFamilies to VoltraWidget
    struct VoltraWidgetWithSupplementalFamilies: Widget {
      private let wrapped = VoltraWidget()

      var body: some WidgetConfiguration {
        if #available(iOS 18.0, *) {
          return wrapped.body.supplementalActivityFamilies([${familiesSwift}])
        } else {
          return wrapped.body
        }
      }
    }
  `
}
```

**Step 2: Verify types compile**

Run: `cd plugin && npm run typecheck`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add plugin/src/features/ios/files/swift/widgetBundle.ts
git commit -m "feat(plugin): generate supplementalActivityFamilies in widget bundle"
```

---

### Task 9: Wire Up Plugin to Pass Activity Config

**Files:**

- Modify: `plugin/src/features/ios/files/swift/index.ts` (or wherever widgetBundle is called)
- Modify: `plugin/src/features/ios/index.ts`
- Modify: `plugin/src/types/plugin.ts` (add to IOSPluginProps)

**Step 1: Update IOSPluginProps**

In `plugin/src/types/plugin.ts`:

```typescript
/**
 * Props passed to iOS-related plugins
 */
export interface IOSPluginProps {
  targetName: string
  bundleIdentifier: string
  deploymentTarget: string
  widgets?: WidgetConfig[]
  groupIdentifier: string
  projectRoot: string
  platformProjectRoot: string
  // NEW: Live activity configuration
  liveActivity?: LiveActivityConfig
}
```

**Step 2: Update withIOS to pass liveActivity config**

In `plugin/src/features/ios/index.ts` (or the file that calls withIOS):

```typescript
// Find where generateWidgetBundleSwift or generateDefaultWidgetBundleSwift is called
// and pass the supplementalFamilies parameter

// Example:
const bundleSwift =
  props.widgets && props.widgets.length > 0
    ? generateWidgetBundleSwift(props.widgets, props.liveActivity?.supplementalFamilies)
    : generateDefaultWidgetBundleSwift(props.liveActivity?.supplementalFamilies)
```

**Step 3: Update main plugin index.ts**

In `plugin/src/index.ts`, pass the liveActivity config:

```typescript
// Apply iOS configuration (files, xcode, podfile, plist, eas)
config = withIOS(config, {
  targetName,
  bundleIdentifier,
  deploymentTarget,
  widgets: props.widgets,
  groupIdentifier: props.groupIdentifier,
  liveActivity: props.liveActivity, // NEW
})
```

**Step 4: Verify types compile**

Run: `cd plugin && npm run typecheck`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add plugin/src/types/plugin.ts plugin/src/features/ios/index.ts plugin/src/index.ts
git commit -m "feat(plugin): wire up liveActivity config to iOS generation"
```

---

### Task 10: Write Tests for TypeScript Changes

**Files:**

- Create: `src/live-activity/__tests__/supplemental.test.ts`

**Step 1: Write renderer tests**

Create `src/live-activity/__tests__/supplemental.test.ts`:

```typescript
import { renderLiveActivityToJson } from '../renderer'

describe('renderLiveActivityToJson with supplemental families', () => {
  it('should render supplemental.small to saf_sm key', () => {
    const mockElement = { type: 'Text', props: { children: 'Watch View' } }

    // Note: This test assumes a mock renderer or simplified test setup
    // Adjust based on actual test infrastructure
    const result = renderLiveActivityToJson({
      lockScreen: mockElement,
      supplemental: {
        small: mockElement,
      },
    })

    expect(result).toHaveProperty('ls')
    expect(result).toHaveProperty('saf_sm')
  })

  it('should handle empty supplemental object', () => {
    const mockElement = { type: 'Text', props: { children: 'Lock Screen' } }

    const result = renderLiveActivityToJson({
      lockScreen: mockElement,
      supplemental: {},
    })

    expect(result).toHaveProperty('ls')
    expect(result).not.toHaveProperty('saf_sm')
  })

  it('should not include supplemental keys when not provided', () => {
    const mockElement = { type: 'Text', props: { children: 'Lock Screen' } }

    const result = renderLiveActivityToJson({
      lockScreen: mockElement,
    })

    expect(result).toHaveProperty('ls')
    expect(result).not.toHaveProperty('saf_sm')
  })
})
```

**Step 2: Run tests**

Run: `npm test -- --testPathPattern=supplemental`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/live-activity/__tests__/supplemental.test.ts
git commit -m "test: add tests for supplemental activity families rendering"
```

---

### Task 11: Write Tests for Plugin Changes

**Files:**

- Create or modify: `plugin/src/__tests__/validation.test.ts`
- Create or modify: `plugin/src/__tests__/widgetBundle.test.ts`

**Step 1: Write validation tests**

```typescript
// plugin/src/__tests__/validateActivity.test.ts
import { validateLiveActivityConfig } from '../validation/validateActivity'

describe('validateLiveActivityConfig', () => {
  it('should accept valid activity families', () => {
    expect(() =>
      validateLiveActivityConfig({
        supplementalFamilies: ['small'],
      })
    ).not.toThrow()
  })

  it('should reject invalid activity families', () => {
    expect(() =>
      validateLiveActivityConfig({
        supplementalFamilies: ['invalid' as any],
      })
    ).toThrow(/Invalid activity family/)

    expect(() =>
      validateLiveActivityConfig({
        supplementalFamilies: ['medium' as any], // medium is not valid for config
      })
    ).toThrow(/Invalid activity family/)
  })

  it('should reject empty array', () => {
    expect(() =>
      validateLiveActivityConfig({
        supplementalFamilies: [],
      })
    ).toThrow(/cannot be empty/)
  })

  it('should accept undefined config', () => {
    expect(() => validateLiveActivityConfig(undefined)).not.toThrow()
  })
})
```

**Step 2: Write widget bundle generation tests**

```typescript
// plugin/src/__tests__/widgetBundle.test.ts
import { generateDefaultWidgetBundleSwift } from '../features/ios/files/swift/widgetBundle'

describe('generateDefaultWidgetBundleSwift', () => {
  it('should generate basic widget bundle without supplemental families', () => {
    const result = generateDefaultWidgetBundleSwift()

    expect(result).toContain('VoltraWidget()')
    expect(result).not.toContain('supplementalActivityFamilies')
  })

  it('should generate widget bundle with supplemental families', () => {
    const result = generateDefaultWidgetBundleSwift(['small'])

    expect(result).toContain('VoltraWidgetWithSupplementalFamilies()')
    expect(result).toContain('supplementalActivityFamilies([.small])')
    expect(result).toContain('#available(iOS 18.0, *)')
  })
})
```

**Step 3: Run tests**

Run: `cd plugin && npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add plugin/src/__tests__/
git commit -m "test: add tests for activity family validation and generation"
```

---

### Task 12: Update Example App to Demonstrate Supplemental Families

**Files:**

- Modify: Example app's Live Activity component (find the appropriate file)

**Step 1: Find and update example Live Activity**

Search for the example Live Activity usage and add supplemental variant:

```tsx
// Example usage demonstrating supplemental families
const { start } = useLiveActivity(
  {
    lockScreen: (
      <Voltra.VStack style={{ padding: 16 }}>
        <Voltra.Text style={{ fontSize: 18, fontWeight: '700' }}>Order #{orderId}</Voltra.Text>
        <Voltra.Text style={{ fontSize: 14, color: '#9CA3AF' }}>Driver en route - ETA 12 min</Voltra.Text>
        {/* Full chart/map would go here */}
      </Voltra.VStack>
    ),
    island: {
      // ... existing island config
    },
    // NEW: Supplemental families for watchOS/CarPlay
    supplemental: {
      small: (
        <Voltra.HStack style={{ padding: 12, gap: 8 }}>
          <Voltra.Text style={{ fontSize: 16, fontWeight: '700' }}>12 min</Voltra.Text>
          <Voltra.Text style={{ fontSize: 14, color: '#9CA3AF' }}>En route</Voltra.Text>
        </Voltra.HStack>
      ),
    },
  },
  { activityName: 'order-tracker' }
)
```

**Step 2: Update example app.json/app.config.js**

```json
{
  "expo": {
    "plugins": [
      [
        "voltra",
        {
          "groupIdentifier": "group.com.example.app",
          "liveActivity": {
            "supplementalFamilies": ["small"]
          }
        }
      ]
    ]
  }
}
```

**Step 3: Commit**

```bash
git add example/
git commit -m "docs: add supplemental families example usage"
```

---

### Task 13: Update Documentation

**Files:**

- Update relevant documentation files

**Step 1: Document the new API**

Create or update documentation to include:

1. **API Reference** for `supplemental` variant:

   ```typescript
   supplemental?: {
     small?: ReactNode   // iOS 18+: watchOS Smart Stack, CarPlay (falls back to lockScreen)
   }
   ```

2. **Plugin Configuration** (REQUIRED to enable):

   ```json
   {
     "liveActivity": {
       "supplementalFamilies": ["small"]
     }
   }
   ```

3. **iOS Version Requirements**:
   - iOS 18.0+ for supplemental families
   - Graceful degradation on iOS 16.2-17.x (no watchOS/CarPlay support, works on phone)
   - Fallback: If `supplemental.small` not provided, uses `lockScreen` content automatically

4. **Design Guidelines**:
   - `small` view should be compact (watchOS Smart Stack is ~38mm width)
   - Focus on essential information only
   - Use high-contrast colors for glanceability
   - Keep animations minimal for performance

**Step 2: Commit**

```bash
git add docs/
git commit -m "docs: add supplemental activity families documentation"
```

---

## Verification Steps

After all tasks are complete, verify the implementation:

### 1. TypeScript Compilation

```bash
npm run typecheck
cd plugin && npm run typecheck
```

### 2. Run All Tests

```bash
npm test
cd plugin && npm test
```

### 3. Build Example App

```bash
cd example
npx expo prebuild --clean
npx pod-install
xcodebuild -workspace ios/*.xcworkspace -scheme ExampleApp build
```

### 4. Manual Testing on Device

1. Deploy to iPhone running iOS 18+
2. Start a Live Activity with `supplemental.small` content
3. Verify it appears in watchOS Smart Stack on paired Apple Watch
4. Verify correct content is displayed (supplemental.small, not lockScreen)

---

## Rollback Plan

If issues arise:

1. **TypeScript changes are additive** - old code without `supplemental` will continue to work
2. **Swift changes use availability checks** - iOS 17 and below unaffected
3. **Plugin changes are optional** - `liveActivity` config is not required

---

## Future Considerations

1. **iOS 26 CarPlay Support**: When iOS 26 ships, verify CarPlay rendering works with `.small` family
2. **Push Notification Updates**: Ensure ActivityKit push notifications work with supplemental content
3. **Payload Size**: Monitor payload size impact of additional `saf_sm` region
4. **Additional Families**: If Apple adds more ActivityFamily values, evaluate adding support
