#if canImport(VoltraSharedCore)
  import VoltraSharedCore
#endif

extension VoltraNode {
  /// Whether this node or anything it renders carries a native modifier of the given type that
  /// decodes. It looks through children and through nodes stored in component props, such as a
  /// Gauge or Button label. A descriptor that is skipped at render time, such as
  /// `containerBackground` with an unparsable color, must not make the host drop the default it
  /// replaces.
  func containsNativeModifier(_ type: String) -> Bool {
    switch self {
    case let .element(element):
      if element.nativeModifiers.contains(where: { $0.type == type && VoltraModifierRegistry.canApply($0) }) {
        return true
      }
      if element.children?.containsNativeModifier(type) == true {
        return true
      }
      return element.propNodes.contains { $0.containsNativeModifier(type) }
    case let .array(nodes):
      return nodes.contains { $0.containsNativeModifier(type) }
    case .text, .empty:
      return false
    }
  }
}

private extension VoltraElement {
  /// Nodes stored in props, which renderers draw through `componentProp(_:)`. Style is skipped;
  /// any other object- or array-valued prop is parsed the way `componentProp` parses it, and
  /// values that are not elements parse to nothing.
  var propNodes: [VoltraNode] {
    guard let props else { return [] }
    return props.compactMap { key, value in
      guard key != "style" else { return nil }
      switch value {
      case .object, .array:
        let node = VoltraNode(from: value)
        return node.isEmpty ? nil : node
      default:
        return nil
      }
    }
  }
}
