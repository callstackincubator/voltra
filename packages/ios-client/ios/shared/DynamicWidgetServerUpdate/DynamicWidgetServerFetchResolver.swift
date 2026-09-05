import Foundation

/// Collapses a burst of timeline requests for one scope into a single fetch.
///
/// WidgetKit asks for a timeline once per widget instance per reload, and tapping the refresh
/// button produces two reloads for one tap (the intent's own reload plus the automatic
/// post-intent one). Without this, a widget placed twice in two sizes would fetch four times for
/// what the user experienced as one refresh — and the reload budget is shared across every widget
/// in the app.
///
/// The payload engine already coalesces this way; this is the same window, keyed by scope so it
/// keeps working when instances arrive.
public actor DynamicWidgetServerFetchCoordinator {
  public static let defaultCoalesceInterval: TimeInterval = 3

  public static let shared = DynamicWidgetServerFetchCoordinator()

  private var lastRun: [WidgetScope: Date] = [:]
  private let coalesceInterval: TimeInterval

  public init(coalesceInterval: TimeInterval = DynamicWidgetServerFetchCoordinator.defaultCoalesceInterval) {
    self.coalesceInterval = coalesceInterval
  }

  /// Whether this request should fetch, or ride on one that just happened.
  public func shouldFetch(_ scope: WidgetScope, now: Date = Date()) -> Bool {
    if let last = lastRun[scope], now.timeIntervalSince(last) < coalesceInterval {
      return false
    }

    lastRun[scope] = now
    return true
  }
}
