//
//  VoltraModifierType.swift
//
//  AUTO-GENERATED from data/modifiers.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// All available Voltra modifier types
/// This enum provides exhaustive type checking for modifiers
public enum VoltraModifierType: String, Codable, CaseIterable {
    case frame
    case padding
    case offset
    case position
    case foregroundStyle
    case background
    case backgroundStyle
    case tint
    case opacity
    case cornerRadius
    case font
    case fontWeight
    case italic
    case smallCaps
    case monospacedDigit
    case lineLimit
    case lineSpacing
    case kerning
    case multilineTextAlignment
    case underline
    case strikethrough
    case shadow
    case scaleEffect
    case rotationEffect
    case border
    case clipped
    case glassEffect
    case gaugeStyle
    
    /// Modifier category for organization and grouping
    public var category: ModifierCategory {
        switch self {
        case .frame, .padding, .offset, .position:
            return .layout
        case .foregroundStyle, .background, .backgroundStyle, .tint, .opacity, .cornerRadius:
            return .style
        case .font, .fontWeight, .italic, .smallCaps, .monospacedDigit, .lineLimit, .lineSpacing, .kerning, .multilineTextAlignment, .underline, .strikethrough:
            return .text
        case .shadow, .scaleEffect, .rotationEffect, .border, .clipped, .glassEffect:
            return .effect
        case .gaugeStyle:
            return .gauge
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
