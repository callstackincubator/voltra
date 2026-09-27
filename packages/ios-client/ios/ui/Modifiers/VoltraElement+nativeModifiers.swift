#if canImport(VoltraSharedCore)
  import VoltraSharedCore
#endif

extension VoltraNode {
  /// Which of the given native modifier types this node or anything it renders carries in a
  /// descriptor that decodes, found in one walk that stops once all are found.
  func nativeModifierTypes(among types: Set<String>) -> Set<String> {
    var found: Set<String> = []
    collectNativeModifierTypes(among: types, into: &found)
    return found
  }

  private func collectNativeModifierTypes(among types: Set<String>, into found: inout Set<String>) {
    guard found.count < types.count else { return }
    switch self {
    case let .element(element):
      for descriptor in element.nativeModifiers
        where types.contains(descriptor.type) && !found.contains(descriptor.type) && VoltraModifierRegistry.canApply(descriptor)
      {
        found.insert(descriptor.type)
      }
      element.children?.collectNativeModifierTypes(among: types, into: &found)
      for node in element.propNodes.values {
        node.collectNativeModifierTypes(among: types, into: &found)
      }
    case let .array(nodes):
      for node in nodes {
        node.collectNativeModifierTypes(among: types, into: &found)
      }
    case .text, .empty:
      return
    }
  }

  /// Whether this node or anything it renders carries a native modifier of the given type that
  /// decodes. It looks through children and through nodes stored in component props, such as a
  /// Gauge or Button label. A descriptor that is skipped at render time, such as
  /// `containerBackground` with an unparsable color, must not make the host drop the default it
  /// replaces.
  func containsNativeModifier(_ type: String) -> Bool {
    !nativeModifierTypes(among: [type]).isEmpty
  }
}
