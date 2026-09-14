extension VoltraElement {
  /// Descriptors decoded from the JSON-encoded `modifiers` prop.
  var nativeModifiers: [VoltraModifierDescriptor] {
    VoltraModifierRegistry.parseDescriptors(props?["modifiers"]?.stringValue)
  }
}

extension VoltraNode {
  /// Whether this node or any descendant carries a native modifier of the given type.
  func containsNativeModifier(_ type: String) -> Bool {
    switch self {
    case let .element(element):
      if element.nativeModifiers.contains(where: { $0.type == type }) {
        return true
      }
      return element.children?.containsNativeModifier(type) ?? false
    case let .array(nodes):
      return nodes.contains { $0.containsNativeModifier(type) }
    case .text, .empty:
      return false
    }
  }
}
