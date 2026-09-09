import Foundation

/// What one server-update run decided, before it becomes a timeline.
public enum DynamicWidgetServerUpdateOutcome: Equatable {
  /// Props were committed, or the server said `304` and what we have is still current.
  case committed
  /// Nothing to do: the widget has no URL, the app turned fetching off, or another request in the
  /// same burst just fetched.
  case skipped
  /// The fetch failed in a way that waiting could fix. Previous props stay on screen.
  case retry
  /// The fetch or the response failed in a way waiting will not fix. Previous props stay.
  case failed
  /// The settings the response was built from are no longer current, so it was dropped.
  case dropped
}

/// The outcome plus what the server asked about the next fetch.
public struct DynamicWidgetServerUpdateResult: Equatable {
  public let outcome: DynamicWidgetServerUpdateOutcome
  /// `Cache-Control: max-age` on a success, `Retry-After` on a `429` or `503`, in minutes and
  /// already clamped to what WidgetKit can honour. Nil when the server said nothing and the
  /// widget's own interval stands.
  public let nextIntervalMinutes: Int?

  public init(_ outcome: DynamicWidgetServerUpdateOutcome, nextIntervalMinutes: Int? = nil) {
    self.outcome = outcome
    self.nextIntervalMinutes = nextIntervalMinutes
  }
}

/// Fetch, parse, trial-render, commit — the four steps ADR 0002 requires of every server-driven
/// widget, with every collaborator injected so the failure table can be tested without a network,
/// a JS runtime, or WidgetKit.
///
/// The rule the ordering exists for: props that do not render are never committed. A server that
/// starts returning a shape the widget throws on leaves the last good props on screen instead of
/// replacing them with a blank tile.
public struct DynamicWidgetServerUpdateRunner {
  public typealias Fetch = (WidgetScope, ResolvedWidgetServerSettings, String?) async -> WidgetServerFetchResult

  private let resolveSettings: (WidgetScope) -> ResolvedWidgetServerSettings
  private let currentRevision: (WidgetScope) -> Int
  private let readEtag: (WidgetScope, String?) -> String?
  private let fetch: Fetch
  private let writeEtag: (WidgetScope, String, String?) -> Void
  private let trialRender: (WidgetScope, String) -> Bool
  private let commitProps: (WidgetScope, String) throws -> Void
  private let recordSuccess: (WidgetScope, Int, Int) -> Void
  private let recordFailure: (WidgetScope, String, Int?) -> Void
  private let markDisabled: (WidgetScope, Bool) -> Void
  private let now: () -> Date

  public init(
    resolveSettings: @escaping (WidgetScope) -> ResolvedWidgetServerSettings,
    currentRevision: @escaping (WidgetScope) -> Int,
    readEtag: @escaping (WidgetScope, String?) -> String?,
    fetch: @escaping Fetch,
    writeEtag: @escaping (WidgetScope, String, String?) -> Void,
    trialRender: @escaping (WidgetScope, String) -> Bool,
    commitProps: @escaping (WidgetScope, String) throws -> Void,
    recordSuccess: @escaping (WidgetScope, Int, Int) -> Void,
    recordFailure: @escaping (WidgetScope, String, Int?) -> Void,
    markDisabled: @escaping (WidgetScope, Bool) -> Void,
    now: @escaping () -> Date = Date.init
  ) {
    self.resolveSettings = resolveSettings
    self.currentRevision = currentRevision
    self.readEtag = readEtag
    self.fetch = fetch
    self.writeEtag = writeEtag
    self.trialRender = trialRender
    self.commitProps = commitProps
    self.recordSuccess = recordSuccess
    self.recordFailure = recordFailure
    self.markDisabled = markDisabled
    self.now = now
  }

  public func run(_ scope: WidgetScope) async -> DynamicWidgetServerUpdateResult {
    let settings = resolveSettings(scope)

    guard settings.shouldFetch, let url = settings.url else {
      markDisabled(scope, settings.enabled)
      return DynamicWidgetServerUpdateResult(.skipped)
    }

    let revision = currentRevision(scope)
    let result = await fetch(scope, settings, readEtag(scope, url))

    // Settings that moved while we were on the network make this response answer a question
    // nobody is asking any more.
    guard currentRevision(scope) == revision else {
      VoltraLogger.widget.debug("Dropping server update for '\(scope.widgetId, privacy: .public)': settings changed mid-fetch")
      return DynamicWidgetServerUpdateResult(.dropped)
    }

    switch result {
    case let .notModified(nextIntervalMinutes):
      recordSuccess(scope, epochMs(), 304)
      return DynamicWidgetServerUpdateResult(.committed, nextIntervalMinutes: clamped(nextIntervalMinutes))

    case let .networkFailure(message):
      VoltraLogger.widget.error("Server update for '\(scope.widgetId, privacy: .public)' failed: \(message, privacy: .public)")
      recordFailure(scope, DynamicWidgetServerStatus.errorNetwork, nil)
      return DynamicWidgetServerUpdateResult(.retry)

    case let .tooLarge(httpStatus):
      // The server answered, with a body the extension will not hold. Asking again returns the
      // same one, so this is a parse failure rather than something to back off from.
      VoltraLogger.widget.error("Server update for '\(scope.widgetId, privacy: .public)' returned a body that is too large")
      recordFailure(scope, DynamicWidgetServerStatus.errorParse, httpStatus)
      return DynamicWidgetServerUpdateResult(.failed)

    case let .httpFailure(httpStatus, retryAfterMinutes):
      let error = result.isUnauthorized ? DynamicWidgetServerStatus.errorUnauthorized : DynamicWidgetServerStatus.errorHttp

      VoltraLogger.widget.error("Server update for '\(scope.widgetId, privacy: .public)' got HTTP \(httpStatus, privacy: .public)")
      recordFailure(scope, error, httpStatus)

      // A 401 will keep being a 401 until the app sets a fresh token, and setting one reloads the
      // widget. Retrying sooner would only spend the reload budget.
      guard result.isTransient else {
        return DynamicWidgetServerUpdateResult(.failed)
      }

      return DynamicWidgetServerUpdateResult(.retry, nextIntervalMinutes: clamped(retryAfterMinutes))

    case let .success(body, etag, httpStatus, nextIntervalMinutes):
      return commit(
        scope: scope,
        url: url,
        body: body,
        etag: etag,
        httpStatus: httpStatus,
        nextIntervalMinutes: clamped(nextIntervalMinutes)
      )
    }
  }

  /// What the server asked for, held to what WidgetKit can honour: never sooner than 15 minutes,
  /// never further out than a day.
  private func clamped(_ minutes: Int?) -> Int? {
    minutes.map { WidgetServerUpdateDefaults.clampIntervalMinutes($0) }
  }

  private func commit(
    scope: WidgetScope,
    url: String,
    body: Data,
    etag: String?,
    httpStatus: Int,
    nextIntervalMinutes: Int?
  ) -> DynamicWidgetServerUpdateResult {
    switch DynamicWidgetServerProps.parse(body) {
    case let .invalid(reason):
      VoltraLogger.widget.error("Server update for '\(scope.widgetId, privacy: .public)' rejected: \(reason, privacy: .public)")
      recordFailure(scope, DynamicWidgetServerStatus.errorParse, httpStatus)
      // Asking again returns the same body, so this is not something to retry.
      return DynamicWidgetServerUpdateResult(.failed)

    case let .props(json):
      guard trialRender(scope, json) else {
        VoltraLogger.widget.error(
          "Server update for '\(scope.widgetId, privacy: .public)' did not render; keeping the previous props"
        )
        recordFailure(scope, DynamicWidgetServerStatus.errorRender, httpStatus)
        return DynamicWidgetServerUpdateResult(.failed)
      }

      do {
        try commitProps(scope, json)
      } catch {
        // Storage is not something the server can fix, and there is no error kind for it, so it is
        // reported as a render failure: the props arrived and could not be put on screen.
        VoltraLogger.widget.error(
          "Could not store fetched props for '\(scope.widgetId, privacy: .public)': \(error.localizedDescription, privacy: .public)"
        )
        recordFailure(scope, DynamicWidgetServerStatus.errorRender, httpStatus)
        return DynamicWidgetServerUpdateResult(.failed)
      }

      writeEtag(scope, url, etag)
      recordSuccess(scope, epochMs(), httpStatus)

      return DynamicWidgetServerUpdateResult(.committed, nextIntervalMinutes: nextIntervalMinutes)
    }
  }

  private func epochMs() -> Int {
    Int(now().timeIntervalSince1970 * 1000)
  }
}
