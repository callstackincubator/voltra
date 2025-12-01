# Voltra Modifier Type Generator

This directory contains the code generation system for Voltra UI modifiers. It provides a **single source of truth** for all modifier definitions and generates type-safe code for both TypeScript and Swift.

## 📁 Directory Structure

```
voltra/
├── data/
│   └── modifiers.json              # ⭐ Source of Truth - All modifier definitions
├── schemas/
│   └── modifiers.schema.json       # JSON Schema for validation
├── generator/
│   ├── generate-types.ts           # Main orchestrator script
│   ├── validate-schema.ts          # Schema validation
│   ├── types.ts                    # Shared TypeScript types
│   ├── tsconfig.json               # TypeScript config for generator
│   └── generators/
│       ├── typescript.ts           # TypeScript code generator
│       └── swift.ts                # Swift code generator
├── src/modifiers/                  # 🤖 Generated TypeScript types
│   ├── .generated                  # Marker file
│   ├── types.ts
│   ├── layout.ts
│   ├── style.ts
│   ├── text.ts
│   ├── effect.ts
│   ├── gauge.ts
│   └── index.ts
└── ios-files/VoltraUI-main/Sources/VoltraUI/Generated/
    ├── .generated                                      # Marker file
    ├── VoltraModifierType.swift                        # 🤖 Generated enum
    └── VoltraModifierType+Helpers.swift                # 🤖 Generated helpers
```

## 🚀 Quick Start

### Generate Types

```bash
npm run generate
```

This will:

1. ✅ Validate `data/modifiers.json` against the schema
2. 📝 Generate TypeScript types in `src/modifiers/`
3. 🍎 Generate Swift enum in `ios-files/.../Generated/`

### Watch Mode

```bash
npm run generate:watch
```

Automatically regenerates when `data/modifiers.json` changes.

### Validate Only

```bash
npm run validate
```

## 📝 Adding a New Modifier

1. **Edit `data/modifiers.json`**

```json
{
  "name": "myNewModifier",
  "category": "effect",
  "description": "Does something awesome",
  "swiftAvailability": "iOS 13.0",
  "args": {
    "value": {
      "type": "number",
      "optional": false,
      "description": "The awesome value"
    }
  }
}
```

2. **Run the generator**

```bash
npm run generate
```

3. **Implement in Swift**

Open `ios-files/VoltraUI-main/Sources/VoltraUI/Extensions/View.modifiers.swift` and add a case:

```swift
case .myNewModifier:  // ✅ Autocomplete works!
    if let value = modifier.args?["value"]?.toDouble() {
        tempView = AnyView(tempView.myNewModifier(CGFloat(value)))
    }
```

The Swift compiler will **force you** to handle all modifiers thanks to exhaustive enum checking!

## 🎯 Benefits

### ✅ Type Safety

**Before (loose types):**

```typescript
const mod = {
  name: 'paddingggg', // ❌ Typo - no error!
  args: { alll: 10 }, // ❌ Typo - no error!
}
```

**After (generated types):**

```typescript
const mod: PaddingModifier = {
  name: 'padding', // ✅ Autocomplete + type-checked
  args: { all: 10 }, // ✅ Typed properties
}
```

### ✅ Exhaustive Checking in Swift

```swift
switch modifier.type {
case .padding:
    // handle
case .foregroundStyle:
    // handle
// ✅ Compiler error if any case is missing!
}
```

### ✅ Single Source of Truth

- One file (`data/modifiers.json`) defines everything
- Changes propagate to both TypeScript and Swift
- No manual sync needed
- Documentation included

## 📖 Modifier Definition Schema

### Basic Modifier

```json
{
  "name": "opacity",
  "category": "style",
  "description": "Sets the opacity of the view",
  "swiftAvailability": "iOS 13.0, macOS 10.15",
  "args": {
    "value": {
      "type": "number",
      "optional": false,
      "description": "Opacity value between 0 and 1"
    }
  }
}
```

### Modifier with Enum Values

```json
{
  "name": "gaugeStyle",
  "category": "gauge",
  "description": "Sets the gauge style",
  "swiftAvailability": "iOS 16.0",
  "args": {
    "style": {
      "type": "string",
      "optional": false,
      "enum": ["accessoryCircular", "accessoryLinear", "linearCapacity"],
      "description": "The gauge style"
    }
  }
}
```

### Modifier with Union Types

For modifiers that accept different argument signatures (like `scaleEffect`):

```json
{
  "name": "scaleEffect",
  "category": "effect",
  "description": "Scales the view",
  "swiftAvailability": "iOS 13.0",
  "argsUnion": [
    {
      "value": {
        "type": "number",
        "optional": false,
        "description": "Uniform scale factor"
      }
    },
    {
      "x": {
        "type": "number",
        "optional": true,
        "description": "Horizontal scale factor"
      },
      "y": {
        "type": "number",
        "optional": true,
        "description": "Vertical scale factor"
      }
    }
  ]
}
```

## 🔧 Generated TypeScript Output

### Category File (`src/modifiers/layout.ts`)

```typescript
export type PaddingModifier = Modifier<
  'padding',
  {
    /** Uniform padding on all edges */
    all?: number
    /** Padding on top edge */
    top?: number
    // ...
  }
>

export type LayoutModifiers = FrameModifier | PaddingModifier | OffsetModifier
```

### Index File (`src/modifiers/index.ts`)

```typescript
export type VoltraModifier = LayoutModifiers | StyleModifiers | TextModifiers | EffectModifiers | GaugeModifiers
```

### Usage

```typescript
import type { VoltraModifier, PaddingModifier } from './modifiers'

// Fully typed!
const padding: PaddingModifier = {
  name: 'padding',
  args: { all: 10 },
}
```

## 🍎 Generated Swift Output

### Enum (`VoltraModifierType.swift`)

```swift
public enum VoltraModifierType: String, Codable, CaseIterable {
    case padding
    case foregroundStyle
    // ... all 25 modifiers

    public var category: ModifierCategory {
        switch self {
        case .padding, .frame, .offset:
            return .layout
        // ...
        }
    }
}
```

### Helpers (`VoltraModifierType+Helpers.swift`)

```swift
extension VoltraUIModifier {
    public var type: VoltraModifierType? {
        VoltraModifierType(rawValue: name)
    }
}

extension Array where Element == VoltraUIModifier {
    public func filter(type: VoltraModifierType) -> [VoltraUIModifier] {
        filter { $0.type == type }
    }
}
```

## 🏗️ Architecture

```
data/modifiers.json (25 modifiers)
       ↓
   [Validation]
       ↓
   [Generator]
       ↓
   ┌───────────────┐
   ↓               ↓
TypeScript       Swift
(7 files)      (2 files)
```

## 🔍 Validation

The generator validates:

- ✅ JSON matches schema
- ✅ No duplicate modifier names
- ✅ All required fields present
- ✅ Enum values are valid
- ✅ Type values are correct

## 📊 Statistics

- **Total Modifiers:** 25
- **Categories:** 5 (layout, style, text, effect, gauge)
- **Generated TypeScript Files:** 8
- **Generated Swift Files:** 3
- **Lines of Code Generated:** ~600

## 🎨 Customization

### Modify Templates

Edit the generator files:

- `generator/generators/typescript.ts` - TypeScript output format
- `generator/generators/swift.ts` - Swift output format

### Change Output Location

Edit `generator/generate-types.ts`:

```typescript
const TS_OUTPUT_DIR = path.join(ROOT_DIR, 'src/modifiers')
const SWIFT_OUTPUT_DIR = path.join(ROOT_DIR, 'ios-files/.../Generated')
```

## 🧪 Testing

After generation:

1. **TypeScript:** Run linter

```bash
npm run lint
```

2. **Swift:** Build in Xcode

```bash
npm run open:ios
```

3. **Verify exhaustiveness:** Remove a case from Swift switch - should get compiler error!

## 📚 Further Reading

- [JSON Schema Documentation](https://json-schema.org/)
- [TypeScript Union Types](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html)
- [Swift Enums](https://docs.swift.org/swift-book/LanguageGuide/Enumerations.html)

## 🤝 Contributing

When adding a new modifier:

1. Add to `data/modifiers.json`
2. Run `npm run generate`
3. Implement in Swift `View.modifiers.swift`
4. Test thoroughly
5. Commit all generated files

## 📄 License

MIT - Same as Voltra
