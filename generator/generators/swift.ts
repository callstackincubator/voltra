import type { ModifiersData } from '../types'

type GeneratedFiles = {
  [filename: string]: string
}

const generateSwiftEnum = (data: ModifiersData): string => {
  const { version, modifiers } = data

  const cases = modifiers.map((m) => `    case ${m.name}`).join('\n')

  const categoryMap = modifiers.reduce(
    (acc, m) => {
      if (!acc[m.category]) acc[m.category] = []
      acc[m.category].push(m.name)
      return acc
    },
    {} as Record<string, string[]>
  )

  const categorySwitchCases = Object.entries(categoryMap)
    .map(([category, names]) => {
      const caseLine = names.map((name) => `.${name}`).join(', ')
      return `        case ${caseLine}:\n            return .${category}`
    })
    .join('\n')

  return `//
//  VoltraModifierType.swift
//  VoltraUI
//
//  🤖 AUTO-GENERATED from data/modifiers.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: ${version}
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import Foundation

/// All available Voltra UI modifier types
/// This enum provides exhaustive type checking for modifiers
public enum VoltraModifierType: String, Codable, CaseIterable {
${cases}
    
    /// Modifier category for organization and grouping
    public var category: ModifierCategory {
        switch self {
${categorySwitchCases}
        }
    }
}

/// Modifier categories
public enum ModifierCategory: String, Codable {
    case layout
    case style
    case text
    case effect
    case gauge
}
`
}

const generateSwiftHelpers = (data: ModifiersData): string => {
  const { version } = data

  return `//
//  VoltraModifierType+Helpers.swift
//  VoltraUI
//
//  🤖 AUTO-GENERATED from data/modifiers.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: ${version}
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import Foundation

// MARK: - VoltraUIModifier Extensions

extension VoltraUIModifier {
    /// Typed modifier name (returns nil if the modifier name is not recognized)
    public var type: VoltraModifierType? {
        VoltraModifierType(rawValue: name)
    }
    
    /// Modifier category (returns nil if the modifier name is not recognized)
    public var category: ModifierCategory? {
        type?.category
    }
    
    /// Check if this modifier is of a specific type
    public func isType(_ type: VoltraModifierType) -> Bool {
        self.type == type
    }
    
    /// Check if this modifier belongs to a specific category
    public func isCategory(_ category: ModifierCategory) -> Bool {
        self.category == category
    }
}

// MARK: - Array Extensions

extension Array where Element == VoltraUIModifier {
    /// Filter modifiers by type
    public func filter(type: VoltraModifierType) -> [VoltraUIModifier] {
        filter { $0.type == type }
    }
    
    /// Filter modifiers by category
    public func filter(category: ModifierCategory) -> [VoltraUIModifier] {
        filter { $0.category == category }
    }
    
    /// Check if array contains a modifier of specific type
    public func contains(type: VoltraModifierType) -> Bool {
        contains { $0.type == type }
    }
}
`
}

export const generateSwiftTypes = (data: ModifiersData): GeneratedFiles => {
  const files: GeneratedFiles = {}

  files['VoltraModifierType.swift'] = generateSwiftEnum(data)
  files['VoltraModifierType+Helpers.swift'] = generateSwiftHelpers(data)

  files['.generated'] = `This directory contains auto-generated Swift files.
DO NOT EDIT MANUALLY.

Generated from: data/modifiers.json
Schema version: ${data.version}

To regenerate these files, run:
  npm run generate
`

  return files
}
