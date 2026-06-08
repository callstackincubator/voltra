import ExpoModulesCore
import Foundation
import WidgetKit

/// Track 5 / Phase 3b-iii — dev-mode silent-push handler that triggers a widget refresh.
///
/// Background
/// ----------
/// Client-rendered home-screen widgets need an external trigger to re-fetch fresh Metro
/// bundles when JSX files change while the host app is backgrounded. Two earlier attempts
/// were tried and ruled out (see VOLTRA_CLIENT_RENDERED_WIDGETS.md "Hot reload exploration
/// log"):
///
///   - Timeline-policy polling (`.after(1s)`): iOS rate-limits to ~5 min even in simulator.
///   - JS-side WebSocket to Metro's `/hot` endpoint: RN's JS runtime suspends in background.
///
/// What this handler does
/// ----------------------
/// When Voltra's Metro middleware detects a `'use voltra'` widget file change, it fires
/// `xcrun simctl push booted <bundle-id> <payload>` with a silent push payload containing
/// a `voltra-dev-reload` discriminator key. iOS delivers the push to the host app — even
/// when backgrounded — and gives the app a brief background-execution window. This handler
/// runs in that window, filters for the discriminator key, and calls
/// `WidgetCenter.shared.reloadAllTimelines()`. WidgetKit then spawns each client-rendered
/// widget extension, whose Provider fetches the freshly bundled JSX from Metro and renders
/// the updated UI.
///
/// Why this works where the others failed:
///   - iOS itself is the always-alive entity delivering the push — no app-side listener
///     is required between events.
///   - `WidgetCenter.reloadAllTimelines()` is an explicit reload, bypassing the timeline
///     policy rate-limiter (which throttles `.after(<short>)` to ~5 min).
///
/// Registration
/// ------------
/// `internal` access (not `public`) so this class is NOT exposed in Voltra-Swift.h —
/// avoiding a bridging-header compile error where the auto-generated ObjC interface
/// references `EXBaseAppDelegateSubscriber` from ExpoModulesCore's Swift→ObjC bridge,
/// which isn't visible to consumers of `@import ExpoModulesCore`.
///
/// Explicit `@objc(VoltraDevReloadHandler)` so `NSClassFromString("VoltraDevReloadHandler")`
/// from NativeVoltra.mm resolves to this Swift class without name mangling — that ObjC
/// `+load` in NativeVoltra.mm is what triggers `registerIfNeeded()` at framework load
/// time, so we don't depend on the lazy TurboModule (`VoltraModule.init`) ever being
/// instantiated by JS code paths. Before this change, the registration only happened
/// when JS imported a Voltra API; with the cleanup that removed the `enableClientWidgetHotReload`
/// call from `_layout.tsx`, nothing in app startup touched VoltraModule so the handler
/// silently never registered.
///
/// `ExpoAppDelegate` dispatches `application(_:didReceiveRemoteNotification:fetchCompletionHandler:)`
/// to every registered subscriber, aggregating the `UIBackgroundFetchResult` results, so
/// pushes without our discriminator key are passed through (`.noData`) to let other
/// subscribers (e.g. `NotificationsAppDelegateSubscriber`) process their own pushes.
///
/// Scope
/// -----
/// Simulator-only. Real-device dev would need an APNs setup (push certificate, push
/// token registration). For PoC scope, simulator + `xcrun simctl push` is enough — that's
/// where widget development happens day-to-day anyway.
@objc(VoltraDevReloadHandler)
final class VoltraDevReloadHandler: ExpoAppDelegateSubscriber {
  /// Discriminator key in the silent-push payload. Pushes lacking this key are treated as
  /// belonging to other subscribers and silently passed through.
  static let voltraDevReloadKey = "voltra-dev-reload"

  /// `@objc` here is necessary because the protocol declares this method as
  /// `@objc optional` — without explicit `@objc`, Swift's implicit conformance
  /// generation can skip exposing the method to the Objective-C dispatch chain that
  /// ExpoAppDelegateSubscriberManager uses (`responds(to:selector:)` would return false,
  /// and the manager skips us). Symptom is the method silently never being called even
  /// though the push is delivered to the app.
  @objc
  func application(
    _: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    VoltraLogger.widget.info("[VoltraDevReloadHandler] push received, voltra-dev-reload present=\(userInfo[Self.voltraDevReloadKey] != nil)")
    guard userInfo[Self.voltraDevReloadKey] != nil else {
      // Not our push — contribute `.noData` to the aggregate so other subscribers (e.g.
      // expo-notifications) can still process their own pushes.
      completionHandler(.noData)
      return
    }

    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
      VoltraLogger.widget.info("[VoltraDevReloadHandler] reloadAllTimelines() called")
    }
    completionHandler(.newData)
  }
}
