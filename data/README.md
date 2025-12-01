# Modifier Definitions

This directory contains the **single source of truth** for all Voltra UI modifiers.

## ⭐ modifiers.json

The `modifiers.json` file defines all 25 available modifiers with their:

- Name
- Category (layout, style, text, effect, gauge)
- Description
- Platform availability
- Arguments with types and descriptions

## ✏️ Editing

When you edit `modifiers.json`:

1. Run validation:

   ```bash
   npm run validate
   ```

2. Generate types:

   ```bash
   npm run generate
   ```

3. Implement in Swift if needed (new modifiers)

## 📖 Schema

See `../schemas/modifiers.schema.json` for the full JSON Schema definition.

## 🔄 Automatic Generation

All TypeScript and Swift types are generated from this file. See `../generator/README.md` for details.
