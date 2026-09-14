import Foundation

/// A single component element in the Voltra UI tree
public struct VoltraElement: Hashable {
  /// Component type name (e.g., "VStack", "Text", "Button")
  public let type: String

  /// Optional identifier for the element
  public let id: String?

  /// Child nodes or text content
  public let children: VoltraNode?

  /// Raw properties (stored as JSONValue for type safety).
  ///
  /// Stylesheet indices and shared element references are substituted for the values they point
  /// at while parsing, so this holds no handle into a per-payload lookup table.
  private let _props: [String: JSONValue]?

  /// Style dictionary with expanded keys, resolved once while parsing.
  private let _style: [String: JSONValue]?

  // MARK: - Hashable

  /// `_props` carries fully resolved values, so it alone distinguishes elements that render
  /// differently. Identity deliberately omits `_style`, which is derived from `_props` and would
  /// only restate it.
  public func hash(into hasher: inout Hasher) {
    hasher.combine(type)
    hasher.combine(id)
    hasher.combine(children)
    hasher.combine(_props)
  }

  public static func == (lhs: VoltraElement, rhs: VoltraElement) -> Bool {
    lhs.type == rhs.type &&
      lhs.id == rhs.id &&
      lhs.children == rhs.children &&
      lhs._props == rhs._props
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
    _style
  }

  // MARK: - Initialization

  /// Initialize from JSONValue (no serialization roundtrip)
  ///
  /// The stylesheet and shared elements are consumed here rather than retained: every reference
  /// into them is replaced by the value it names, leaving a self-contained element.
  /// - Parameters:
  ///   - json: The JSON value to parse
  ///   - stylesheet: Optional shared stylesheet for style deduplication
  ///   - sharedElements: Optional shared elements array for element deduplication
  public init?(from json: JSONValue, stylesheet: [[String: JSONValue]]? = nil, sharedElements: [JSONValue]? = nil) {
    guard case let .object(dict) = json else {
      return nil
    }

    // Decode component type as Int (numeric ID) and convert to component name
    guard case let .int(typeID) = dict["t"],
          let componentTypeID = ComponentTypeID(rawValue: typeID)
    else {
      return nil
    }
    type = componentTypeID.componentName

    // Extract id
    id = dict["i"]?.stringValue

    // Extract children
    if let childrenValue = dict["c"] {
      children = VoltraNode(from: childrenValue, stylesheet: stylesheet, sharedElements: sharedElements)
    } else {
      children = nil
    }

    // Extract props, substituting the values behind every stylesheet index and shared element
    // reference so the element stops depending on lookup tables it does not carry.
    let resolvedProps: [String: JSONValue]?
    if let propsValue = dict["p"], case let .object(propsDict) = propsValue {
      resolvedProps = Self.resolvingReferences(
        inProps: propsDict,
        stylesheet: stylesheet,
        sharedElements: sharedElements,
        depth: 0
      )
    } else {
      resolvedProps = nil
    }

    _props = resolvedProps
    _style = Self.expandedStyle(from: resolvedProps)
  }

  /// Get component prop by name - handles both single component and array
  public func componentProp(_ propName: String) -> VoltraNode {
    guard let propValue = props?[propName] else { return .empty }

    return VoltraNode(from: propValue)
  }

  /// Decode parameters from props
  public func parameters<T: Decodable>(_: T.Type) -> T {
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

  // MARK: - Reference Resolution

  /// Caps recursion so a payload whose references form a cycle cannot loop forever.
  private static let maxResolutionDepth = 64

  /// Substitutes the stylesheet entry behind a style index, and the shared element behind a
  /// `$r` reference, throughout a props dictionary.
  ///
  /// Element-valued props carry serialized nodes of their own, and those nodes reference the
  /// same payload-level tables. Leaving them unresolved would make two elements with equal
  /// props compare equal while rendering differently.
  private static func resolvingReferences(
    inProps props: [String: JSONValue],
    stylesheet: [[String: JSONValue]]?,
    sharedElements: [JSONValue]?,
    depth: Int
  ) -> [String: JSONValue] {
    guard stylesheet != nil || sharedElements != nil, depth < maxResolutionDepth else {
      return props
    }

    var resolved = props
    for (key, value) in props {
      if ShortNames.expand(key) == "style" {
        if let index = value.intValue,
           let stylesheet = stylesheet,
           index >= 0, index < stylesheet.count
        {
          resolved[key] = .object(stylesheet[index])
        }
      } else {
        resolved[key] = resolvingReferences(
          in: value,
          stylesheet: stylesheet,
          sharedElements: sharedElements,
          depth: depth + 1
        )
      }
    }
    return resolved
  }

  /// Resolves references inside a value that may hold serialized nodes.
  private static func resolvingReferences(
    in value: JSONValue,
    stylesheet: [[String: JSONValue]]?,
    sharedElements: [JSONValue]?,
    depth: Int
  ) -> JSONValue {
    guard depth < maxResolutionDepth else { return value }

    switch value {
    case let .array(items):
      return .array(items.map {
        resolvingReferences(in: $0, stylesheet: stylesheet, sharedElements: sharedElements, depth: depth + 1)
      })

    case let .object(dict):
      // Element reference ($r key) - substitute the shared element it names
      if let refIndex = dict["$r"]?.intValue,
         let sharedElements = sharedElements,
         refIndex >= 0, refIndex < sharedElements.count
      {
        return resolvingReferences(
          in: sharedElements[refIndex],
          stylesheet: stylesheet,
          sharedElements: sharedElements,
          depth: depth + 1
        )
      }

      var resolved = dict
      if let propsValue = dict["p"], case let .object(propsDict) = propsValue {
        resolved["p"] = .object(resolvingReferences(
          inProps: propsDict,
          stylesheet: stylesheet,
          sharedElements: sharedElements,
          depth: depth + 1
        ))
      }
      if let childrenValue = dict["c"] {
        resolved["c"] = resolvingReferences(
          in: childrenValue,
          stylesheet: stylesheet,
          sharedElements: sharedElements,
          depth: depth + 1
        )
      }
      return .object(resolved)

    default:
      return value
    }
  }

  /// Expands the short keys of an already resolved style prop into full property names.
  private static func expandedStyle(from props: [String: JSONValue]?) -> [String: JSONValue]? {
    guard let styleValue = props?["s"] ?? props?["style"],
          let styleDict = styleValue.objectValue
    else {
      return nil
    }

    var expanded: [String: JSONValue] = [:]
    for (key, value) in styleDict {
      // Use unified ShortNames mapping for style properties
      expanded[ShortNames.expand(key)] = value
    }
    return expanded
  }
}
