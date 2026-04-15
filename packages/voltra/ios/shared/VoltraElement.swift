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

  /// Runtime-only values used when resolving wrapped payload expressions.
  public let resolvableEnvironment: ResolvableEnvironment

  // MARK: - Hashable

  public func hash(into hasher: inout Hasher) {
    hasher.combine(type)
    hasher.combine(id)
    hasher.combine(children)
    hasher.combine(_props)
    hasher.combine(resolvableEnvironment)
  }

  public static func == (lhs: VoltraElement, rhs: VoltraElement) -> Bool {
    lhs.type == rhs.type &&
      lhs.id == rhs.id &&
      lhs.children == rhs.children &&
      lhs._props == rhs._props &&
      lhs.resolvableEnvironment == rhs.resolvableEnvironment
  }

  private static let emptyJSONObjectData = Data("{}".utf8)

  private init(
    type: String,
    id: String?,
    children: VoltraNode?,
    props: [String: JSONValue]?,
    stylesheet: [[String: JSONValue]]?,
    sharedElements: [JSONValue]?,
    resolvableEnvironment: ResolvableEnvironment
  ) {
    self.type = type
    self.id = id
    self.children = children
    _props = props
    self.stylesheet = stylesheet
    self.sharedElements = sharedElements
    self.resolvableEnvironment = resolvableEnvironment
  }

  // MARK: - Computed Properties

  /// Expanded props with full property names
  public var props: [String: JSONValue]? {
    guard let props = _props else { return nil }
    var expanded: [String: JSONValue] = [:]
    for (key, value) in props {
      // Expand short key to full name using unified ShortNames mapping
      let fullKey = ShortNames.expand(key)
      expanded[fullKey] = resolveValueIfNeeded(value)
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
       let stylesheet = stylesheet,
       index >= 0, index < stylesheet.count
    {
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
      expanded[expandedKey] = resolveValueIfNeeded(value)
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

    // Extract props
    if let propsValue = dict["p"], case let .object(propsDict) = propsValue {
      _props = propsDict
    } else {
      _props = nil
    }

    // Store stylesheet reference
    self.stylesheet = stylesheet

    // Store shared elements reference
    self.sharedElements = sharedElements

    resolvableEnvironment = .init()
  }

  public func withResolvableEnvironment(_ environment: ResolvableEnvironment) -> VoltraElement {
    .init(
      type: type,
      id: id,
      children: children,
      props: _props,
      stylesheet: stylesheet,
      sharedElements: sharedElements,
      resolvableEnvironment: environment
    )
  }

  /// Get component prop by name - handles both single component and array
  public func componentProp(_ propName: String) -> VoltraNode {
    guard let propValue = props?[propName] else { return .empty }

    return VoltraNode(from: propValue, stylesheet: stylesheet, sharedElements: sharedElements)
  }

  /// Decode parameters from props
  public func parameters<T: Decodable>(_: T.Type) -> T {
    guard let props = props else {
      // Return default instance if decoding fails
      return try! JSONDecoder().decode(T.self, from: Self.emptyJSONObjectData)
    }

    do {
      // Convert JSONValue dictionary to [String: Any] for JSONSerialization
      let dict = props.mapValues { $0.toAny() }
      let jsonData = try JSONSerialization.data(withJSONObject: dict, options: [])
      return try JSONDecoder().decode(T.self, from: jsonData)
    } catch {
      // Return default instance if decoding fails
      return try! JSONDecoder().decode(T.self, from: Self.emptyJSONObjectData)
    }
  }

  private func resolveValueIfNeeded(_ value: JSONValue) -> JSONValue {
    guard containsResolvableValue(value) else {
      return value
    }

    return ResolvableValueEvaluator.resolve(value, environment: resolvableEnvironment)
  }

  private func containsResolvableValue(_ value: JSONValue) -> Bool {
    switch value {
    case .null, .bool, .int, .double, .string:
      return false
    case let .array(items):
      return items.contains(where: containsResolvableValue)
    case let .object(object):
      if object.keys.contains(ResolvableWireKey.sentinel) {
        return true
      }

      return object.values.contains(where: containsResolvableValue)
    }
  }
}
