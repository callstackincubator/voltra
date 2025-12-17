import Foundation

/// A single component element in the Voltra UI tree
public struct VoltraElement: Hashable {
    /// Component type name (e.g., "VStack", "Text", "Button")
    public let type: String

    /// Optional identifier for the element
    public let id: String?

    /// Child nodes or text content
    public let children: VoltraNode?

    /// Raw properties (stored as JSONValue for type safety)
    private let _props: [String: JSONValue]?

    /// Optional stylesheet for resolving style references
    public let stylesheet: [[String: JSONValue]]?

    /// Optional shared elements for resolving element references
    public let sharedElements: [JSONValue]?

    // MARK: - Hashable

    public func hash(into hasher: inout Hasher) {
        hasher.combine(type)
        hasher.combine(id)
        // Note: props are not included in hash for performance
    }

    public static func == (lhs: VoltraElement, rhs: VoltraElement) -> Bool {
        return lhs.type == rhs.type && lhs.id == rhs.id
    }

    // MARK: - Computed Properties

    /// Expanded props with full property names
    public var props: [String: JSONValue]? {
        guard let props = _props else { return nil }
        var expanded: [String: JSONValue] = [:]
        for (key, value) in props {
            // Expand short key to full name using unified ShortNames mapping
            let fullKey = ShortNames.expand(key)
            expanded[fullKey] = value
        }
        return expanded.isEmpty ? nil : expanded
    }

    /// Style dictionary with expanded keys
    public var style: [String: JSONValue]? {
        guard let styleValue = props?["style"] else {
            return nil
        }

        let styleDict: [String: JSONValue]

        // Handle stylesheet reference (integer index)
        if let index = styleValue.intValue,
           let stylesheet = self.stylesheet,
           index >= 0 && index < stylesheet.count {
            styleDict = stylesheet[index]
        }
        // Handle inline style (object)
        else if let objectValue = styleValue.objectValue {
            styleDict = objectValue
        } else {
            return nil
        }

        var expanded: [String: JSONValue] = [:]
        for (key, value) in styleDict {
            // Use unified ShortNames mapping for style properties
            let expandedKey = ShortNames.expand(key)
            expanded[expandedKey] = value
        }

        return expanded
    }

    // MARK: - Initialization

    /// Initialize from JSONValue (no serialization roundtrip)
    /// - Parameters:
    ///   - json: The JSON value to parse
    ///   - stylesheet: Optional shared stylesheet for style deduplication
    ///   - sharedElements: Optional shared elements array for element deduplication
    public init?(from json: JSONValue, stylesheet: [[String: JSONValue]]? = nil, sharedElements: [JSONValue]? = nil) {
        guard case .object(let dict) = json else {
            return nil
        }

        // Decode component type as Int (numeric ID) and convert to component name
        guard case .int(let typeID) = dict["t"],
              let componentTypeID = ComponentTypeID(rawValue: typeID) else {
            return nil
        }
        self.type = componentTypeID.componentName

        // Extract id
        self.id = dict["i"]?.stringValue

        // Extract children
        if let childrenValue = dict["c"] {
            self.children = VoltraNode(from: childrenValue, stylesheet: stylesheet, sharedElements: sharedElements)
        } else {
            self.children = nil
        }

        // Extract props
        if let propsValue = dict["p"], case .object(let propsDict) = propsValue {
            self._props = propsDict
        } else {
            self._props = nil
        }

        // Store stylesheet reference
        self.stylesheet = stylesheet

        // Store shared elements reference
        self.sharedElements = sharedElements
    }

    /// Get component prop by name - handles both single component and array
    public func componentProp(_ propName: String) -> VoltraNode {
        guard let propValue = props?[propName] else { return .empty }

        return VoltraNode(from: propValue, stylesheet: stylesheet, sharedElements: sharedElements)
    }

    /// Decode parameters from props
    public func parameters<T: Decodable>(_ type: T.Type) -> T {
        guard let props = props else {
            // Return default instance if decoding fails
            return try! JSONDecoder().decode(T.self, from: "{}".data(using: .utf8)!)
        }

        do {
            // Convert JSONValue dictionary to [String: Any] for JSONSerialization
            let dict = props.mapValues { $0.toAny() }
            let jsonData = try JSONSerialization.data(withJSONObject: dict, options: [])
            return try JSONDecoder().decode(T.self, from: jsonData)
        } catch {
            // Return default instance if decoding fails
            return try! JSONDecoder().decode(T.self, from: "{}".data(using: .utf8)!)
        }
    }
}
