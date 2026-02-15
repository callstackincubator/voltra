import SwiftUI

extension DynamicTypeSize {
  /// Maps a numeric multiplier to the closest upper bound DynamicTypeSize level
  /// - Parameter multiplier: The multiplier from maxFontSizeMultiplier (e.g., 1.5, 2.0)
  /// - Returns: The corresponding DynamicTypeSize
  static func from(multiplier: Double) -> DynamicTypeSize {
    if multiplier <= 1.0 { return .large }
    if multiplier <= 1.15 { return .xLarge }
    if multiplier <= 1.30 { return .xxLarge }
    if multiplier <= 1.50 { return .xxxLarge }
    if multiplier <= 1.90 { return .accessibility1 }
    if multiplier <= 2.35 { return .accessibility2 }
    if multiplier <= 3.00 { return .accessibility3 }
    if multiplier <= 3.50 { return .accessibility4 }
    return .accessibility5
  }
}
