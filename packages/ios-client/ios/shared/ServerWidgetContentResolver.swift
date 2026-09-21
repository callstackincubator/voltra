import Foundation

/// Decides which server response a server-driven widget renders for one timeline request.
///
/// WidgetKit requests a timeline once per widget instance per reload, and an interactive refresh
/// button produces two reloads for a single tap (the intent's own reload plus the automatic
/// post-intent reload). The resolver collapses such bursts into one network request and answers
/// every request in the burst with the same response. When a fetch fails it hands back the last
/// successful response instead, so the widget never regresses to older or initial content while
/// the server has already provided something newer.
struct ServerWidgetContentResolver {
  enum Outcome {
    /// Fetched now, or fetched moments ago by another request in the same burst.
    case current(Data)
    /// The fetch failed; this is the most recent successful response.
    case lastKnown(Data, Error)
    /// The fetch failed and no successful response exists in this process.
    case unavailable(Error)
  }

  typealias Fetch = (_ widgetId: String) async throws -> Data

  static let defaultCoalesceInterval: TimeInterval = 3

  private let responseStore: ServerWidgetResponseStore
  private let fetch: Fetch
  private let coalesceInterval: TimeInterval
  private let now: () -> Date

  init(
    responseStore: ServerWidgetResponseStore,
    fetch: @escaping Fetch,
    coalesceInterval: TimeInterval = ServerWidgetContentResolver.defaultCoalesceInterval,
    now: @escaping () -> Date = Date.init
  ) {
    self.responseStore = responseStore
    self.fetch = fetch
    self.coalesceInterval = coalesceInterval
    self.now = now
  }

  func resolve(widgetId: String) async -> Outcome {
    if let recent = await responseStore.response(for: widgetId),
       now().timeIntervalSince(recent.fetchedAt) < coalesceInterval
    {
      return .current(recent.data)
    }

    do {
      let data = try await fetch(widgetId)
      await responseStore.store(data, for: widgetId, fetchedAt: now())
      return .current(data)
    } catch {
      if let lastKnown = await responseStore.response(for: widgetId) {
        return .lastKnown(lastKnown.data, error)
      }
      return .unavailable(error)
    }
  }
}
