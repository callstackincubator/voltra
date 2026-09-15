import UIKit

/// The appearance a widget is being drawn in, as the request contract reports it.
///
/// Split out from the rest of `WidgetServer` because it is the one piece that needs UIKit, and
/// keeping it here lets everything else — the resolver, the store, the request builder, the
/// fetcher — be compiled and tested on its own.
public enum VoltraWidgetAppearance {
  public static func currentTheme() -> String {
    UITraitCollection.current.userInterfaceStyle == .dark ? "dark" : "light"
  }

  /// The device state a request carries, for callers that are already on a UIKit-capable target.
  public static func requestContext(family: String? = nil) -> WidgetServerRequestContext {
    VoltraWidgetServer.requestContext(theme: currentTheme(), family: family)
  }
}
