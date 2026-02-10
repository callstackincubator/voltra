# Flexbox Layout Implementation

## Overview

Voltra implements a React Native-compatible flexbox layout system for iOS using SwiftUI's `Layout` protocol. This provides precise control over layout behavior and matches RN's flexbox semantics more closely than SwiftUI's native layout system.

## Architecture

### Core Components

#### 1. `VoltraFlexStackLayout` (Layout Protocol)

The main layout engine that implements single-axis flexbox. It:

- Computes child sizes based on flex properties
- Distributes free space using `flexGrow` and `flexShrink`
- Positions children according to `justifyContent` and `alignItems`
- Handles gaps, padding, and margins

**Location:** `ios/ui/Layout/VoltraFlexStackLayout.swift`

#### 2. `FlexItemLayoutKey` + `FlexItemValues`

SwiftUI's `LayoutValueKey` mechanism for passing flex properties from child to parent:

```swift
struct FlexItemValues {
  var flexGrow: CGFloat = 0
  var flexShrink: CGFloat = 0
  var flexBasis: SizeValue?
  var width: SizeValue?
  var height: SizeValue?
  // ... other properties
}
```

Children set these via `.layoutValue(key: FlexItemLayoutKey.self, value: ...)` and the parent layout reads them.

**Location:** `ios/ui/Style/FlexEnvironment.swift`

#### 3. Container Components

- **`VoltraFlexView`** - The `<View>` component (dynamic flexDirection)
- **`VoltraVStack`** - Vertical stack (flexDirection: column)
- **`VoltraHStack`** - Horizontal stack (flexDirection: row)

All use `VoltraFlexStackLayout` when in flex mode.

#### 4. Style System Integration

- **`StyleConverter`** - Parses JSON styles, applies defaults
- **`CompositeStyleModifier`** - Applies styles to children, sets `FlexItemLayoutKey`
- **`FlexContainerStyleModifier`** - Applies container styles AND sets `FlexItemLayoutKey` for nested containers
- **`isInFlexContainer` environment variable** - Switches between legacy and flex layout paths

## How It Works

### 1. Style Parsing Flow

```
JSON from RN
  ↓
ShortNames.expand ("fg" → "flexGrow")
  ↓
StyleConverter.parseLayout
  • Parses flex/flexGrow/flexShrink from JSON
  • Applies defaults (0 for grow/shrink)
  • Handles flex shorthand (flex: 1 → grow=1, shrink=1, basis=0)
  ↓
LayoutStyle (non-optional flexGrow/flexShrink with defaults applied)
```

### 2. Layout Flow

```
VoltraFlexView creates VoltraFlexStackLayout
  ↓
Children rendered with .environment(\.isInFlexContainer, true)
  ↓
Each child applies FlexContainerStyleModifier or CompositeStyleModifier
  • Sets .layoutValue(key: FlexItemLayoutKey.self, value: FlexItemValues(...))
  ↓
VoltraFlexStackLayout.sizeThatFits
  • Reads FlexItemLayoutKey from each child
  • Computes base sizes (flexBasis or intrinsic)
  • Distributes free space via flexGrow/flexShrink
  • Returns container size
  ↓
VoltraFlexStackLayout.placeSubviews
  • Positions children based on justifyContent
  • Aligns children on cross-axis via alignItems/alignSelf
  • Places each child with computed size
```

### 3. Flex Algorithm (Simplified)

**Phase 1: Compute Base Sizes**

- For each child, determine `flexBasis`:
  - If `flexBasis` is set: use it
  - If `width`/`height` (depending on axis): use it
  - Otherwise: measure intrinsic size
- Apply `minWidth`/`maxWidth`/`minHeight`/`maxHeight` constraints

**Phase 2: Distribute Free Space**

```swift
totalUsed = sum(baseSizes) + sum(margins) + gaps
freeSpace = availableSpace - totalUsed

if freeSpace > 0 {
  // Grow: distribute proportionally by flexGrow
  for child with flexGrow > 0 {
    extraSize = freeSpace * (child.flexGrow / totalFlexGrow)
    finalSize = baseSize + extraSize
  }
} else if freeSpace < 0 {
  // Shrink: reduce proportionally by flexShrink
  for child with flexShrink > 0 {
    reduction = abs(freeSpace) * (child.flexShrink / totalFlexShrink)
    finalSize = baseSize - reduction
  }
}
```

**Phase 3: Position on Main Axis**
Based on `justifyContent`:

- `flex-start`: Start at container's leading edge
- `flex-end`: Start at trailing edge
- `center`: Center items
- `space-between`: Distribute items evenly, no space at edges
- `space-around`: Distribute with half-space at edges
- `space-evenly`: Equal space between all items and edges

**Phase 4: Position on Cross Axis**
Based on `alignItems` (or per-child `alignSelf`):

- `flex-start`: Align to leading edge
- `flex-end`: Align to trailing edge
- `center`: Center on cross-axis
- `stretch`: Expand to fill cross-axis (if no explicit size)

## Differences from React Native Flexbox

### ✅ Supported (RN-Compatible)

| Feature               | Status | Notes                                                                                           |
| --------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| `flexDirection`       | ✅     | `row`, `column`                                                                                 |
| `flexGrow`            | ✅     | Full support                                                                                    |
| `flexShrink`          | ✅     | Full support                                                                                    |
| `flexBasis`           | ✅     | `auto`, fixed, `fill`, `wrap`                                                                   |
| `flex` shorthand      | ✅     | `flex: 1` → `grow=1, shrink=1, basis=0`                                                         |
| `justifyContent`      | ✅     | All values: `flex-start`, `center`, `flex-end`, `space-between`, `space-around`, `space-evenly` |
| `alignItems`          | ✅     | `flex-start`, `center`, `flex-end`, `stretch`                                                   |
| `alignSelf`           | ✅     | Per-child override of `alignItems`                                                              |
| `gap`                 | ✅     | Spacing between children                                                                        |
| `padding`             | ✅     | Inner spacing (handled by flex engine)                                                          |
| `margin`              | ✅     | Outer spacing on children                                                                       |
| `width`/`height`      | ✅     | Fixed sizes, `fill` (`100%`), `wrap` (`auto`)                                                   |
| `minWidth`/`maxWidth` | ✅     | Size constraints                                                                                |
| `aspectRatio`         | ✅     | Maintain aspect ratio                                                                           |

### ❌ Not Supported

| Feature                           | Status | Workaround                     |
| --------------------------------- | ------ | ------------------------------ |
| `flexWrap`                        | ❌     | Single-axis only - no wrapping |
| `flexDirection: 'row-reverse'`    | ❌     | Not implemented                |
| `flexDirection: 'column-reverse'` | ❌     | Not implemented                |
| `alignContent`                    | ❌     | Only relevant with wrapping    |

### 🔄 Implementation Differences

1. **No Multi-Line Wrapping**

   - RN's `flexWrap: 'wrap'` is not supported
   - All items remain on a single axis
   - Use nested containers for multi-line layouts

2. **Environment-Based Mode Switching**

   - Uses `isInFlexContainer` environment variable
   - Legacy layout still exists for backward compatibility
   - Children automatically switch to flex mode when inside flex container

3. **Padding Handling**

   - Padding is handled by the flex layout engine (container padding)
   - Not applied as SwiftUI `.padding()` modifier in flex mode
   - This matches RN's box model more closely

4. **Two-Phase Layout**
   - SwiftUI Layout protocol requires two phases:
     1. `sizeThatFits`: Compute ideal size
     2. `placeSubviews`: Position children
   - RN uses Yoga which has a different algorithm structure

## Enabling Flexbox by Default

### Current State

Flexbox is **partially enabled**:

- `<View>` components use flexbox (`VoltraFlexView`)
- `<VStack>` and `<HStack>` use flexbox when `layout="flex"` prop is set
- Legacy layout (`.frame()` + `.layoutPriority()`) still exists for backward compatibility

### Migration Checklist

To make flexbox the default and remove the legacy system:

#### 1. **Remove Legacy Layout Path** ⚠️ Breaking Change

- [ ] Remove `LayoutModifier` (the legacy `.frame()` based system)
- [ ] Remove the `else` branch in `CompositeStyleModifier` (non-flex path)
- [ ] Remove `layoutPriority` property from `LayoutStyle`
- [ ] Remove `flex` shorthand property (superseded by `flexGrow`/`flexShrink`)

**Files to modify:**

- `ios/ui/Style/LayoutStyle.swift` - Remove `LayoutModifier` struct
- `ios/ui/Style/CompositeStyle.swift` - Remove legacy path
- `ios/ui/Style/StyleConverter.swift` - Remove `layoutPriority` parsing

#### 2. **Enable Flex by Default in VStack/HStack**

- [ ] Remove `layout="flex"` parameter requirement
- [ ] Always use `VoltraFlexStackLayout` in VStack/HStack
- [ ] Remove legacy VStack/HStack rendering paths

**Files to modify:**

- `ios/ui/Views/VoltraVStack.swift` - Remove `legacyBody`, always use `flexBody`
- `ios/ui/Views/VoltraHStack.swift` - Remove `legacyBody`, always use `flexBody`
- `data/components.json` - Remove `layout` prop from VStack/HStack schemas

#### 3. **Remove Environment Variable**

- [ ] Remove `isInFlexContainer` environment variable (always true)
- [ ] Simplify `CompositeStyleModifier` to always use flex child path

**Files to modify:**

- `ios/ui/Style/FlexEnvironment.swift` - Remove `IsInFlexContainerKey`
- `ios/ui/Style/CompositeStyle.swift` - Remove conditional logic
- All container components - Remove `.environment(\.isInFlexContainer, true)` calls

#### 4. **Testing & Validation**

- [ ] Test all example screens with flexbox-only layout
- [ ] Verify nested flex containers work correctly
- [ ] Test edge cases: zero-sized containers, deeply nested layouts
- [ ] Check performance with complex layouts (100+ views)
- [ ] Verify `alignItems: stretch` works correctly
- [ ] Test with dynamic content (text wrapping, images)

#### 5. **Documentation & Migration Guide**

- [ ] Update main README with flexbox-only approach
- [ ] Document breaking changes in CHANGELOG
- [ ] Provide migration guide for users relying on legacy layout
- [ ] Add examples showing flexbox patterns

### Potential Issues

1. **Breaking Changes for Existing Code**

   - Code relying on `layoutPriority` will break
   - VStack/HStack without explicit sizing may render differently
   - Need to provide clear migration path

2. **Performance Considerations**

   - Flex layout is more expensive than simple `.frame()` calls
   - May need optimization for deeply nested layouts
   - Consider caching layout calculations

3. **Missing Features**

   - No `flexWrap` support (users may expect it)
   - No reverse directions (need to document workarounds)

4. **SwiftUI Interop**
   - Need to ensure flexbox plays well with native SwiftUI views
   - May need special handling for SwiftUI components in flex containers

## Future Enhancements

### High Priority

1. **FlexWrap Support** - Enable multi-line layouts
2. **Reverse Directions** - `row-reverse`, `column-reverse`
3. **Performance Optimization** - Layout caching, incremental updates

### Medium Priority

4. **Absolute Positioning** - Children with `position: absolute`
5. **Percentage-Based Sizing** - `width: "50%"`, `height: "25%"`
6. **Advanced Alignment** - `baseline` alignment for text

### Low Priority

7. **Animation Support** - Smooth transitions when flex properties change
8. **Debug Visualization** - Visual overlay showing flex boxes
9. **Layout Inspector** - Tool to debug flex layout issues

## Best Practices

### DO ✅

- Use `flexGrow` and `flexShrink` for responsive layouts
- Prefer `gap` over margin for spacing between items
- Use `alignSelf` to override alignment for specific children
- Set explicit `flexBasis` or `width`/`height` when you know the size
- Use `minWidth`/`maxWidth` to constrain flexible items

### DON'T ❌

- Don't mix legacy and flex layouts in the same container
- Don't rely on `layoutPriority` (it's legacy)
- Don't use large `flexGrow` values (1-3 is usually sufficient)
- Don't nest many flex containers without testing performance
- Don't expect `flexWrap` to work (not implemented)

## Debugging

### Common Issues

**1. Child not growing despite `flexGrow: 1`**

- ✅ Check that the container has defined size (`width: '100%'` or `height: '100%'`)
- ✅ Ensure child doesn't have explicit size that prevents growth

**2. Items not aligned correctly**

- Check `alignItems` on container vs `alignSelf` on child
- Verify you're using the right alignment for the axis (main vs cross)

**3. Unexpected spacing**

- Check if `gap` is set on container
- Verify margins on children
- Ensure `justifyContent` is what you expect

**4. Layout not updating**

- Flex layout may not react to content changes
- Force re-render by changing container key

## Related Files

- `ios/ui/Layout/VoltraFlexStackLayout.swift` - Main layout engine
- `ios/ui/Layout/FlexContainerHelper.swift` - Container utilities
- `ios/ui/Style/FlexEnvironment.swift` - Flex item values
- `ios/ui/Style/CompositeStyle.swift` - Child style application
- `ios/ui/Views/VoltraFlexView.swift` - View component
- `ios/ui/Views/VoltraVStack.swift` - VStack component
- `ios/ui/Views/VoltraHStack.swift` - HStack component

## Resources

- [React Native Flexbox Guide](https://reactnative.dev/docs/flexbox)
- [SwiftUI Layout Protocol](https://developer.apple.com/documentation/swiftui/layout)
- [CSS Flexbox Spec](https://www.w3.org/TR/css-flexbox-1/)
