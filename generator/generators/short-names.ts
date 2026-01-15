import type { ComponentsData } from '../types'

type GeneratedFiles = {
  [filename: string]: string
}

/**
 * Collect all prop names from components
 */
const collectPropNames = (data: ComponentsData): Set<string> => {
  const propNames = new Set<string>()
  // Always include 'style' as it's a universal prop
  propNames.add('style')

  for (const component of data.components) {
    if (component.parameters) {
      for (const propName of Object.keys(component.parameters)) {
        propNames.add(propName)
      }
    }
  }

  return propNames
}

/**
 * Validate that all required names have short forms and there are no collisions
 */
export const validateShortNames = (data: ComponentsData): void => {
  const errors: string[] = []
  const shortNames = data.shortNames ?? {}

  // Collect ALL names that need short forms
  const allNames = new Set<string>()

  // Props from components
  const propNames = collectPropNames(data)
  for (const name of propNames) {
    allNames.add(name)
  }

  // Style properties
  for (const prop of data.styleProperties ?? []) {
    allNames.add(prop)
  }

  // 1. Every name MUST have a short form
  for (const name of allNames) {
    if (!shortNames[name]) {
      errors.push(`Missing shortName for "${name}"`)
    }
  }

  // 2. No duplicate short forms (collision check)
  const shortToNames = new Map<string, string[]>()
  for (const [name, short] of Object.entries(shortNames)) {
    const existing = shortToNames.get(short) ?? []
    existing.push(name)
    shortToNames.set(short, existing)
  }
  for (const [short, names] of shortToNames) {
    if (names.length > 1) {
      errors.push(`Collision: ${names.join(', ')} all map to "${short}"`)
    }
  }

  // 3. Short form should be shorter than original (warning only for now)
  for (const [name, short] of Object.entries(shortNames)) {
    if (short.length >= name.length) {
      console.warn(`Warning: "${short}" is not shorter than "${name}"`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`Short name validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`)
  }
}

/**
 * Generate TypeScript short names mapping
 */
const generateTypeScriptMapping = (data: ComponentsData): string => {
  const { version, shortNames } = data

  // Sort entries for consistent output
  const sortedEntries = Object.entries(shortNames).sort(([a], [b]) => a.localeCompare(b))

  const nameToShortEntries = sortedEntries.map(([name, short]) => `  '${name}': '${short}'`).join(',\n')

  const shortToNameEntries = sortedEntries.map(([name, short]) => `  '${short}': '${name}'`).join(',\n')

  return `/* eslint-disable */
// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: ${version}

/**
 * Unified mapping from full names to short names
 * Used for props and style properties
 */
export const NAME_TO_SHORT: Record<string, string> = {
${nameToShortEntries}
}

/**
 * Reverse mapping from short names to full names
 */
export const SHORT_TO_NAME: Record<string, string> = {
${shortToNameEntries}
}

/**
 * Shorten a name using the unified mapping
 * Returns the original name if no short form exists
 */
export function shorten(name: string): string {
  return NAME_TO_SHORT[name] ?? name
}

/**
 * Expand a short name back to the full name
 * Returns the original value if no expansion exists
 */
export function expand(short: string): string {
  return SHORT_TO_NAME[short] ?? short
}
`
}

/**
 * Generate Swift short names mapping
 */
const generateSwiftMapping = (data: ComponentsData): string => {
  const { version, shortNames } = data

  // Sort entries for consistent output
  const sortedEntries = Object.entries(shortNames).sort(([a], [b]) => a.localeCompare(b))

  const shortToNameCases = sortedEntries.map(([name, short]) => `            "${short}": "${name}"`).join(',\n')

  return `//
//  ShortNames.swift
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: ${version}

import Foundation

/// Unified short name mappings for props and style properties
/// Used to expand compressed payload keys back to their full names
public enum ShortNames {
    /// Mapping from short names to full names
    private static let shortToName: [String: String] = [
${shortToNameCases}
    ]
    
    /// Expand a short name to its full form
    /// - Parameter short: The short name (e.g., "bg", "al", "sp")
    /// - Returns: The full name (e.g., "backgroundColor", "alignment", "spacing"), or the input if no mapping exists
    public static func expand(_ short: String) -> String {
        shortToName[short] ?? short
    }
}
`
}

/**
 * Generate Kotlin short names mapping
 */
const generateKotlinMapping = (data: ComponentsData): string => {
  const { version, shortNames } = data

  // Sort entries for consistent output
  const sortedEntries = Object.entries(shortNames).sort(([a], [b]) => a.localeCompare(b))

  const shortToNameCases = sortedEntries.map(([name, short]) => `        "${short}" to "${name}"`).join(',\n')

  return `//
//  ShortNames.kt
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: ${version}

package voltra.generated

/**
 * Unified short name mappings for props and style properties
 * Used to expand compressed payload keys back to their full names
 */
object ShortNames {
    /** Mapping from short names to full names */
    private val shortToName: Map<String, String> = mapOf(
${shortToNameCases}
    )
    
    /**
     * Expand a short name to its full form
     * @param short The short name (e.g., "bg", "al", "sp")
     * @return The full name (e.g., "backgroundColor", "alignment", "spacing"), or the input if no mapping exists
     */
    fun expand(short: String): String {
        return shortToName[short] ?: short
    }
}
`
}

/**
 * Generate short names mappings for TypeScript, Swift and Kotlin
 */
export const generateShortNames = (data: ComponentsData): GeneratedFiles => {
  const files: GeneratedFiles = {}

  // Validate first
  validateShortNames(data)

  // Generate TypeScript mapping
  files['short-names.ts'] = generateTypeScriptMapping(data)

  // Generate Swift mapping
  files['ShortNames.swift'] = generateSwiftMapping(data)

  // Generate Kotlin mapping
  files['ShortNames.kt'] = generateKotlinMapping(data)

  return files
}
