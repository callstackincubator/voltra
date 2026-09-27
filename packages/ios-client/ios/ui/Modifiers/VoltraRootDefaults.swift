import SwiftUI
import WidgetKit
#if canImport(VoltraSharedCore)
  import VoltraSharedCore
#endif

/// Defaults that widget and Live Activity hosts apply outside the rendered tree (ADR 0005). Host
/// code calls these instead of naming modifiers.
extension View {
  /// Sets the widget's tap URL so that exactly one `widgetURL` applies; Apple leaves several
  /// undefined. A configured deep link takes precedence and the tree's `widgetURL` modifiers are
  /// skipped. Otherwise a `widgetURL` modifier in the tree wins over the synthetic fallback.
  @ViewBuilder
  func voltraWidgetURL(configured: URL?, root: VoltraNode? = nil, fallback: () -> URL? = { nil }) -> some View {
    if let configured {
      environment(\.voltraHostAppliedModifierTypes, ["widgetURL"])
        .widgetURL(configured)
    } else if root?.containsNativeModifier("widgetURL") == true {
      self
    } else if let url = fallback() {
      widgetURL(url)
    } else {
      self
    }
  }

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
