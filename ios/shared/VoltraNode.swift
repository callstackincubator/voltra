import Foundation

/// A single node in the Voltra UI tree
public struct VoltraNode: Hashable {
    /// Component type name (e.g., "VStack", "Text", "Button")
    public let type: String

    /// Optional identifier for the node
    public let id: String?

    /// Child nodes or text content
    public let children: VoltraChildren?

    /// Raw properties (stored as JSONValue for type safety)
    private let _props: [String: JSONValue]?

    // MARK: - Hashable

    public func hash(into hasher: inout Hasher) {
        hasher.combine(type)
        hasher.combine(id)
        // Note: props are not included in hash for performance
    }

    public static func == (lhs: VoltraNode, rhs: VoltraNode) -> Bool {
        return lhs.type == rhs.type && lhs.id == rhs.id
    }

    // MARK: - Computed Properties

    /// Expanded props with full property names
    public var props: [String: JSONValue]? {
        guard let props = _props else { return nil }
        var expanded: [String: JSONValue] = [:]
        for (key, value) in props {
            // Check if key is a numeric string (prop ID)
            if let numericKey = Int(key),
               let propNameID = PropNameID(rawValue: numericKey) {
                // Convert numeric ID to prop name
                expanded[propNameID.propName] = value
            } else {
                // Keep string keys as-is
                expanded[key] = value
            }
        }
        return expanded.isEmpty ? nil : expanded
    }

    /// Style dictionary with expanded keys
    public var style: [String: JSONValue]? {
        guard let styleDict = props?["style"]?.objectValue else {
            return nil
        }

        var expanded: [String: JSONValue] = [:]
        for (key, value) in styleDict {
            let expandedKey = expandStylePropertyName(key)
            expanded[expandedKey] = value
        }

        return expanded
    }

    /// Parsed modifiers
    public var modifiers: [VoltraModifier]? {
        guard let modifiersArray = props?["modifiers"]?.arrayValue else {
            return nil
        }

        return modifiersArray.compactMap { modifier in
            // Modifiers are now arrays: [name, args]
            guard let modifierArray = modifier.arrayValue,
                  modifierArray.count >= 2,
                  let name = modifierArray[0].stringValue,
                  let argsDict = modifierArray[1].objectValue else {
                return nil
            }

            // Expand short modifier name to full name
            let fullName = expandModifierName(name)
            return VoltraModifier(name: fullName, args: argsDict)
        }
    }

    // MARK: - Initialization

    /// Initialize from JSONValue (no serialization roundtrip)
    public init(from json: JSONValue) throws {
        guard case .object(let dict) = json else {
            throw NSError(
                domain: "VoltraNode",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Expected object for VoltraNode"]
            )
        }

        // Decode component type as Int (numeric ID) and convert to component name
        guard case .int(let typeID) = dict["t"],
              let componentTypeID = ComponentTypeID(rawValue: typeID) else {
            let typeValue = dict["t"]
            throw NSError(
                domain: "VoltraNode",
                code: -2,
                userInfo: [NSLocalizedDescriptionKey: "Invalid component type ID: \(String(describing: typeValue))"]
            )
        }
        self.type = componentTypeID.componentName

        // Extract id
        self.id = dict["i"]?.stringValue

        // Extract children
        if let childrenValue = dict["c"] {
            self.children = try VoltraChildren(from: childrenValue)
        } else {
            self.children = nil
        }

        // Extract props
        if let propsValue = dict["p"], case .object(let propsDict) = propsValue {
            self._props = propsDict
        } else {
            self._props = nil
        }
    }

    /// Get component prop by name - handles both single component and array
    public func componentProp(_ propName: String) -> VoltraChildren? {
        guard let propValue = props?[propName] else { return nil }

        // Try to decode as component object directly
        if case .object = propValue {
            do {
                return .node(try VoltraNode(from: propValue))
            } catch {
                return nil
            }
        }

        // Try to decode as component array
        if case .array(let componentsArray) = propValue {
            let nodes = componentsArray.compactMap { componentDict -> VoltraNode? in
                guard case .object = componentDict else { return nil }
                return try? VoltraNode(from: componentDict)
            }
            guard !nodes.isEmpty else { return nil }
            return .nodes(nodes)
        }

        return nil
    }

    // MARK: - Private Helpers

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
            "w": "width",
            "h": "height",
            "op": "opacity",
            "ov": "overflow",
            "ar": "aspectRatio",
            "minw": "minWidth",
            "maxw": "maxWidth",
            "minh": "minHeight",
            "maxh": "maxHeight",
            "fgw": "flexGrowWidth",
            "fsh": "fixedSizeHorizontal",
            "fsv": "fixedSizeVertical",
            "lp": "layoutPriority",
            "zi": "zIndex",
            "ox": "offsetX",
            "oy": "offsetY",
            "ap": "absolutePosition",
            "pos": "position",
            "t": "top",
            "l": "left",
            "r": "right",
            "b": "bottom",
        ]
        return stylePropertyMap[shortName] ?? shortName
    }

}