import SwiftUI
import WidgetKit

/// Defaults that widget and Live Activity hosts apply outside the rendered tree. SwiftUI lets the
/// outer value win, so each default steps aside when the tree carries the native modifier that
/// replaces it (ADR 0005). Host code asks this type instead of naming modifiers.
enum VoltraRootDefaults {
  /// A configured deep link always applies; the synthetic default only when the tree has no
  /// `widgetURL` modifier.
  static func widgetURL(configured: URL?, fallback: () -> URL?, root: VoltraNode?) -> URL? {
    if let configured {
      return configured
    }
    if root?.containsNativeModifier("widgetURL") == true {
      return nil
    }
    return fallback()
  }
}

extension View {
  /// Clears the widget's container background, unless the tree sets its own with a
  /// `containerBackground` modifier.
  @ViewBuilder
  func voltraDefaultContainerBackground(root: VoltraNode?) -> some View {
    if root?.containsNativeModifier("containerBackground") == true {
      self
    } else if #available(iOS 17.0, *) {
      containerBackground(.clear, for: .widget)
    } else {
      self
    }
  }
}
