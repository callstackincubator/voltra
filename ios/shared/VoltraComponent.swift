import Foundation
import SwiftUI

/// This struct constructs a UI Component from JSON.
public struct VoltraComponent: Codable {
    /// Type of component
    ///
    /// This is the equivalent of a SwiftUI View
    public let type: String

    /// Component identifier
    public let id: String?

    /// Component children (at root level) - can be array of components or string (for Text components)
    private let _childrenValue: JSONValue?
    
    /// All component properties including parameters, modifiers, etc.
    /// Stored as JSON-serializable dictionary
    private let _props: [String: Any]?
    
    /// All component properties including parameters, modifiers, etc.
    public var props: [String: Any]? {
        return _props
    }

    /// The current state of an element
    ///
    /// The state can mean the state (on/off), but in case of a text field it can also mean the value of the text field.
    ///
    /// - Note: Do not init state in your UIComponent unless needed.
    public var state: AnyCodable?
    
    // MARK: - Computed Properties

    /// Component children - can be a single component, array of components, or text string
    public var children: VoltraChildren? {
        guard let childrenValue = _childrenValue else { return nil }

        switch childrenValue {
        case .dictionary(let dict):
            // Single component
            let dictAny = dict.mapValues { $0.toAny() } as? [String: Any]
            guard let dictAny = dictAny,
                  let data = try? JSONSerialization.data(withJSONObject: dictAny),
                  let component = try? JSONDecoder().decode(VoltraComponent.self, from: data) else {
                return nil
            }
            return .component(component)

        case .array(let array):
            // Array of components
            let components = try? array.compactMap { jsonValue -> VoltraComponent? in
                guard case .dictionary(let dict) = jsonValue else { return nil }
                let dictAny = dict.mapValues { $0.toAny() } as? [String: Any]
                guard let dictAny = dictAny,
                      let data = try? JSONSerialization.data(withJSONObject: dictAny) else {
                    return nil
                }
                return try? JSONDecoder().decode(VoltraComponent.self, from: data)
            }
            guard let components = components, !components.isEmpty else { return nil }
            return .components(components)

        case .string(let str):
            // Text content
            return .text(str)

        default:
            // Other types not supported
            return nil
        }
    }
    
    /// Type-safe modifiers to apply (from props.modifiers)
    public var modifiers: [VoltraModifier]? {
        guard let modifiersArray = props?["modifiers"] as? [Any] else {
            return nil
        }
        return try? modifiersArray.compactMap { modifier in
            // Modifiers are now arrays: [name, args]
            guard let modifierArray = modifier as? [Any],
                  modifierArray.count >= 2,
                  let name = modifierArray[0] as? String,
                  let argsDict = modifierArray[1] as? [String: Any] else {
                return nil
            }
            // Convert args to AnyCodable
            let args = argsDict.compactMapValues { value -> AnyCodable? in
                if let string = value as? String {
                    return .string(string)
                } else if let int = value as? Int {
                    return .int(int)
                } else if let double = value as? Double {
                    return .double(double)
                } else if let bool = value as? Bool {
                    return .bool(bool)
                }
                return nil
            }
            // Expand short modifier name to full name
            let fullName = expandModifierName(name)
            return VoltraModifier(name: fullName, args: args.isEmpty ? nil : args)
        }
    }
    
    /// Expand short modifier name to full name
    private func expandModifierName(_ shortName: String) -> String {
        let modifierNameMap: [String: String] = [
            "f": "frame",
            "pad": "padding",
            "off": "offset",
            "pos": "position",
            "fg": "foregroundStyle",
            "bg": "background",
            "bgs": "backgroundStyle",
            "tint": "tint",
            "op": "opacity",
            "cr": "cornerRadius",
            "font": "font",
            "fw": "fontWeight",
            "it": "italic",
            "sc": "smallCaps",
            "md": "monospacedDigit",
            "ll": "lineLimit",
            "lsp": "lineSpacing",
            "kern": "kerning",
            "mta": "multilineTextAlignment",
            "ul": "underline",
            "st": "strikethrough",
            "sh": "shadow",
            "se": "scaleEffect",
            "re": "rotationEffect",
            "bd": "border",
            "clip": "clipped",
            "ge": "glassEffect",
            "gs": "gaugeStyle",
        ]
        return modifierNameMap[shortName] ?? shortName
    }
    
    /// Expand short style property name to full name
    private func expandStylePropertyName(_ shortName: String) -> String {
        let stylePropertyMap: [String: String] = [
            "pad": "padding",
            "pv": "paddingVertical",
            "ph": "paddingHorizontal",
            "pt": "paddingTop",
            "pb": "paddingBottom",
            "pl": "paddingLeft",
            "pr": "paddingRight",
            "m": "margin",
            "mv": "marginVertical",
            "mh": "marginHorizontal",
            "mt": "marginTop",
            "mb": "marginBottom",
            "ml": "marginLeft",
            "mr": "marginRight",
            "bg": "backgroundColor",
            "br": "borderRadius",
            "bw": "borderWidth",
            "bc": "borderColor",
            "sc": "shadowColor",
            "so": "shadowOffset",
            "sop": "shadowOpacity",
            "sr": "shadowRadius",
            "fs": "fontSize",
            "fw": "fontWeight",
            "c": "color",
            "ls": "letterSpacing",
            "fv": "fontVariant",
        ]
        return stylePropertyMap[shortName] ?? shortName
    }
    
    /// Style property with expanded property names
    public var style: [String: Any]? {
        guard let styleDict = props?["style"] as? [String: Any] else {
            return nil
        }
        
        var expanded: [String: Any] = [:]
        for (key, value) in styleDict {
            let expandedKey = expandStylePropertyName(key)
            
            // Handle nested objects (e.g., shadowOffset: { width, height })
            if let nestedDict = value as? [String: Any] {
                expanded[expandedKey] = nestedDict
            } else {
                expanded[expandedKey] = value
            }
        }
        
        return expanded
    }
    
    /// Component-specific parameters (all props, parameter structs will decode only their defined fields)
    public var parametersRaw: [String: AnyCodable]? {
        guard let props = props else { return nil }
        // Convert to AnyCodable (only primitives supported for parameter decoding)
        // Note: Complex nested structures (modifiers arrays) are handled separately
        // but included here so parameter structs can access them if needed
        let converted = props.compactMapValues { value -> AnyCodable? in
            if let string = value as? String {
                return .string(string)
            } else if let int = value as? Int {
                return .int(int)
            } else if let double = value as? Double {
                return .double(double)
            } else if let bool = value as? Bool {
                return .bool(bool)
            }
            // For nested structures, we can't convert to AnyCodable directly
            // but they're still in props and accessible via the props property
            return nil
        }
        return converted.isEmpty ? nil : converted
    }
    
    // MARK: - Codable
    
    enum CodingKeys: String, CodingKey {
        case t, i, c, p, s
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Decode component type as Int (numeric ID) and convert to component name
        let typeID = try container.decode(Int.self, forKey: .t)
        guard let componentTypeID = ComponentTypeID(rawValue: typeID) else {
            throw DecodingError.dataCorruptedError(
                forKey: .t,
                in: container,
                debugDescription: "Invalid component type ID: \(typeID)"
            )
        }
        type = componentTypeID.componentName
        
        id = try container.decodeIfPresent(String.self, forKey: .i)
        state = try container.decodeIfPresent(AnyCodable.self, forKey: .s)
        
        // Decode children from root level (can be array or string)
        if container.contains(.c) {
            _childrenValue = try? container.decode(JSONValue.self, forKey: .c)
        } else {
            _childrenValue = nil
        }
        
        // Decode props using JSONSerialization to handle nested structures
        if container.contains(.p) {
            // Get the raw JSON value for props
            let propsJSON = try container.decode(JSONValue.self, forKey: .p)
            _props = propsJSON.toDictionary()
        } else {
            _props = nil
        }
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(type, forKey: .t)
        try container.encodeIfPresent(id, forKey: .i)
        try container.encodeIfPresent(state, forKey: .s)
        
        // Encode children at root level
        if let childrenValue = _childrenValue {
            try container.encode(childrenValue, forKey: .c)
        }
        
        if let props = _props {
            let jsonValue = JSONValue.fromAny(props)
            try container.encode(jsonValue, forKey: .p)
        }
    }
}

extension VoltraComponent: Hashable {
    public func hash(into hasher: inout Hasher) {
        hasher.combine(type)
        hasher.combine(id)
        // Note: props are not included in hash for performance
        // Components with same type and id are considered equal
    }
    
    public static func == (lhs: VoltraComponent, rhs: VoltraComponent) -> Bool {
        return lhs.type == rhs.type && lhs.id == rhs.id
        // Note: props comparison is omitted for performance
    }
}

// Helper type to decode/encode arbitrary JSON values
private enum JSONValue: Codable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case array([JSONValue])
    case dictionary([String: JSONValue])
    case null
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let bool = try? container.decode(Bool.self) {
            self = .bool(bool)
        } else if let int = try? container.decode(Int.self) {
            self = .int(int)
        } else if let double = try? container.decode(Double.self) {
            self = .double(double)
        } else if let string = try? container.decode(String.self) {
            self = .string(string)
        } else if let array = try? container.decode([JSONValue].self) {
            self = .array(array)
        } else if let dict = try? container.decode([String: JSONValue].self) {
            self = .dictionary(dict)
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid JSON value")
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value):
            try container.encode(value)
        case .int(let value):
            try container.encode(value)
        case .double(let value):
            try container.encode(value)
        case .bool(let value):
            try container.encode(value)
        case .array(let value):
            try container.encode(value)
        case .dictionary(let value):
            try container.encode(value)
        case .null:
            try container.encodeNil()
        }
    }
    
    func toAny() -> Any {
        switch self {
        case .string(let value):
            return value
        case .int(let value):
            return value
        case .double(let value):
            return value
        case .bool(let value):
            return value
        case .array(let value):
            return value.map { $0.toAny() }
        case .dictionary(let value):
            return value.mapValues { $0.toAny() }
        case .null:
            return NSNull()
        }
    }
    
    func toDictionary() -> [String: Any]? {
        switch self {
        case .dictionary(let dict):
            return dict.mapValues { $0.toAny() } as? [String: Any]
        default:
            return nil
        }
    }
    
    static func fromAny(_ value: Any) -> JSONValue {
        if value is NSNull {
            return .null
        } else if let string = value as? String {
            return .string(string)
        } else if let int = value as? Int {
            return .int(int)
        } else if let double = value as? Double {
            return .double(double)
        } else if let bool = value as? Bool {
            return .bool(bool)
        } else if let array = value as? [Any] {
            return .array(array.map { fromAny($0) })
        } else if let dict = value as? [String: Any] {
            return .dictionary(dict.mapValues { fromAny($0) })
        } else {
            return .null
        }
    }
}

/// Represents the different types of children a component can have
public enum VoltraChildren {
    case component(VoltraComponent)
    case components([VoltraComponent])
    case text(String)
}

public struct VoltraModifier: Codable, Hashable {
    public let name: String
    public let args: [String: AnyCodable]?
}
