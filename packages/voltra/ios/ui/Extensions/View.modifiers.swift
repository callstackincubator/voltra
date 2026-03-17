import SwiftUI

extension View {
  /// Conditionally apply a modifier if the value is not nil
  ///
  /// - Parameters:
  ///   - value: The optional value to check
  ///   - transform: The transformation to apply if value is not nil
  /// - Returns: The modified view or the original view if value is nil
  @ViewBuilder
  func voltraIfLet<Value, Content: View>(_ value: Value?, @ViewBuilder _ transform: (Self, Value) -> Content) -> some View {
    if let value {
      transform(self, value)
    } else {
      self
    }
  }

  /// Conditionally applies a transformation to the view.
  @ViewBuilder
  func voltraIf<Content: View>(_ condition: Bool, @ViewBuilder _ transform: (Self) -> Content) -> some View {
    if condition {
      transform(self)
    } else {
      self
    }
  }
}
