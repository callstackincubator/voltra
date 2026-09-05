import Foundation

/// What the widget is told about the server side of its props, as `env.serverUpdate`.
///
/// Deliberately not the props themselves: fetched props are committed to the Dynamic Widget's
/// existing props slot, so the render path cannot tell whether they came from a fetch or from
/// `updateDynamicWidget`. This record is only the story around them.
public struct DynamicWidgetServerStatus: Equatable, Codable {
  public static let fresh = "fresh"
  public static let stale = "stale"
  public static let never = "never"
  public static let disabled = "disabled"

  public static let errorNetwork = "network"
  public static let errorHttp = "http"
  public static let errorUnauthorized = "unauthorized"
  public static let errorParse = "parse"
  public static let errorRender = "render"

  public let status: String
  public let fetchedAt: Int?
  public let error: String?
  public let httpStatus: Int?

  public init(status: String, fetchedAt: Int? = nil, error: String? = nil, httpStatus: Int? = nil) {
    self.status = status
    self.fetchedAt = fetchedAt
    self.error = error
    self.httpStatus = httpStatus
  }

  /// What a widget sees before any fetch has succeeded.
  public static let neverFetched = DynamicWidgetServerStatus(status: never)

  public func toJSON() -> String {
    var fields = ["\"status\": \(jsonString(status))"]

    fetchedAt.map { fields.append("\"fetchedAt\": \($0)") }
    error.map { fields.append("\"error\": \(jsonString($0))") }
    httpStatus.map { fields.append("\"httpStatus\": \($0)") }

    return "{ \(fields.joined(separator: ", ")) }"
  }

  private func jsonString(_ value: String) -> String {
    let escaped = value
      .replacingOccurrences(of: "\\", with: "\\\\")
      .replacingOccurrences(of: "\"", with: "\\\"")

    return "\"\(escaped)\""
  }
}

/// Per-scope record of how the last fetch went, in the App Group so the app and the widget
/// extension agree on it.
///
/// Kept apart from the props themselves so that clearing a widget's props — logout,
/// `clearWidget` — and clearing its fetch history stay separate decisions.
public struct DynamicWidgetServerPropsStore {
  private let defaults: UserDefaults?

  public init(defaults: UserDefaults? = VoltraConfig.groupIdentifier().flatMap { UserDefaults(suiteName: $0) }) {
    self.defaults = defaults
  }

  public func status(for scope: WidgetScope) -> DynamicWidgetServerStatus {
    guard let data = defaults?.data(forKey: key(scope)),
          let status = try? JSONDecoder().decode(DynamicWidgetServerStatus.self, from: data)
    else {
      return .neverFetched
    }

    return status
  }

  public func put(_ status: DynamicWidgetServerStatus, for scope: WidgetScope) {
    guard let data = try? JSONEncoder().encode(status) else { return }

    defaults?.set(data, forKey: key(scope))
  }

  /// Records a failure without losing the fact that a fetch once worked. `stale` is only
  /// meaningful next to the `fetchedAt` of the last success, so that is carried forward.
  public func recordFailure(_ error: String, httpStatus: Int? = nil, for scope: WidgetScope) {
    let previous = status(for: scope)

    put(
      DynamicWidgetServerStatus(
        status: previous.fetchedAt == nil ? DynamicWidgetServerStatus.never : DynamicWidgetServerStatus.stale,
        fetchedAt: previous.fetchedAt,
        error: error,
        httpStatus: httpStatus
      ),
      for: scope
    )
  }

  public func recordSuccess(fetchedAt: Int, httpStatus: Int, for scope: WidgetScope) {
    put(
      DynamicWidgetServerStatus(status: DynamicWidgetServerStatus.fresh, fetchedAt: fetchedAt, httpStatus: httpStatus),
      for: scope
    )
  }

  /// Reports `disabled` once, keeping the last `fetchedAt` so a widget that comes back under app
  /// control can still say when the server last spoke.
  public func markDisabledIfNeeded(enabled: Bool, for scope: WidgetScope) {
    guard !enabled else { return }

    let previous = status(for: scope)

    guard previous.status != DynamicWidgetServerStatus.disabled else { return }

    put(
      DynamicWidgetServerStatus(status: DynamicWidgetServerStatus.disabled, fetchedAt: previous.fetchedAt),
      for: scope
    )
  }

  public func clear(_ scope: WidgetScope) {
    defaults?.removeObject(forKey: key(scope))
  }

  private func key(_ scope: WidgetScope) -> String {
    "Voltra_DynamicWidgetServer_v1_\(scope.storageKey)"
  }
}
