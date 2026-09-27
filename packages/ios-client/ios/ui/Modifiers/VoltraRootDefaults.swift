import SwiftUI
import WidgetKit
#if canImport(VoltraSharedCore)
  import VoltraSharedCore
#endif

/// Defaults that widget and Live Activity hosts apply outside the rendered tree (ADR 0005). Host
/// code calls these instead of naming modifiers.
extension View {
  /// Sets the tap URL of a view hierarchy that carries at most one `widgetURL`; Apple leaves several
  /// undefined. A configured deep link takes precedence and the tree's `widgetURL` modifiers are
  /// skipped. Otherwise a `widgetURL` modifier in the tree wins over the synthetic fallback.
  @ViewBuilder
  func voltraWidgetURL(configured: URL?, root: VoltraNode? = nil, fallback: () -> URL? = { nil }) -> some View {
    if let configured {
      voltraHostApplies("widgetURL")
        .widgetURL(configured)
    } else if root?.containsNativeModifier("widgetURL") == true {
      self
    } else if let url = fallback() {
      widgetURL(url)
    } else {
      self
    }
  }

  /// For a Dynamic Island region: a configured deep link is set once on the `DynamicIsland`, which
  /// makes it the default for every region, so the region only drops the tree's `widgetURL`
  /// modifiers that would override it.
  @ViewBuilder
  func voltraDeferringWidgetURL(to configured: URL?) -> some View {
    if configured != nil {
      voltraHostApplies("widgetURL")
    } else {
      self
    }
  }

  /// Tints a Live Activity's Lock Screen background with the tint passed when starting or updating
  /// it, which takes precedence over an `activityBackgroundTint` modifier in the tree.
  @ViewBuilder
  func voltraActivityBackgroundTint(configured: Color?) -> some View {
    if let configured {
      voltraHostApplies("activityBackgroundTint")
        .activityBackgroundTint(configured)
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

  /// Marks a native modifier type as applied by the host, so the tree's descriptors of that type
  /// are skipped. Adds to the set, so several host defaults compose.
  private func voltraHostApplies(_ type: String) -> some View {
    transformEnvironment(\.voltraHostAppliedModifierTypes) { $0.insert(type) }
  }
}
