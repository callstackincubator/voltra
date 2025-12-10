//
//  VoltraModifierType+Helpers.swift
//
//  AUTO-GENERATED from data/modifiers.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

// MARK: - VoltraModifier Extensions

extension VoltraModifier {
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

extension Array where Element == VoltraModifier {
    /// Filter modifiers by type
    public func filter(type: VoltraModifierType) -> [VoltraModifier] {
        filter { $0.type == type }
    }
    
    /// Filter modifiers by category
    public func filter(category: ModifierCategory) -> [VoltraModifier] {
        filter { $0.category == category }
    }
    
    /// Check if array contains a modifier of specific type
    public func contains(type: VoltraModifierType) -> Bool {
        contains { $0.type == type }
    }
}
