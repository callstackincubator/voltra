import Foundation

public extension VoltraNode {
  /// Generic type-safe parameter accessor
  /// Only works on element cases, delegates to VoltraElement.parameters
  /// - Parameter type: The parameter struct type to decode
  /// - Returns: Decoded parameters (uses empty dict if props is nil)
  func parameters<T: ComponentParameters>(_ type: T.Type) -> T {
    // Only element cases have parameters
    guard case let .element(element) = self else {
      // For non-element cases, return default instance
      // Safe to force-unwrap: decoding an empty JSON object always succeeds for ComponentParameters
      return try! JSONDecoder().decode(T.self, from: Data("{}".utf8))
    }
    // Delegate to VoltraElement's parameters method
    return element.parameters(type)
  }
}
