import Foundation

/// What came back from the server, before either engine decides what it means.
///
/// The request side is identical for a payload widget and a Dynamic Widget, so it lives here once.
/// Only the interpretation of `body` differs: one parses a Voltra payload, the other props.
public enum WidgetServerFetchResult: Sendable {
  /// `200` with a body. `etag` is present when the response carried one.
  case success(body: Data, etag: String?, httpStatus: Int, nextIntervalMinutes: Int?)
  /// `304`: what is already committed is still current.
  case notModified(nextIntervalMinutes: Int?)
  /// The request never completed: no connectivity, DNS, TLS, or a timeout.
  case networkFailure(message: String)
  /// The server answered with a status we cannot use.
  case httpFailure(httpStatus: Int, retryAfterMinutes: Int?)

  public var isUnauthorized: Bool {
    if case let .httpFailure(status, _) = self {
      return status == 401 || status == 403
    }
    return false
  }

  /// True when waiting and asking again could plausibly succeed.
  public var isTransient: Bool {
    switch self {
    case .networkFailure:
      return true
    case let .httpFailure(status, _):
      return status >= 500 || status == 429
    default:
      return false
    }
  }
}

/// Executes a request built by `WidgetServerRequestBuilder` and reports what happened, without
/// deciding what to do about it.
public enum WidgetServerFetcher {
  public static func fetch(
    _ request: URLRequest,
    session: URLSession = .shared
  ) async -> WidgetServerFetchResult {
    do {
      let (data, response) = try await session.data(for: request)

      guard let http = response as? HTTPURLResponse else {
        return .networkFailure(message: "Response was not an HTTP response")
      }

      let nextIntervalMinutes = maxAgeMinutes(http.value(forHTTPHeaderField: "Cache-Control"))

      if http.statusCode == 304 {
        return .notModified(nextIntervalMinutes: nextIntervalMinutes)
      }

      guard (200 ... 299).contains(http.statusCode) else {
        return .httpFailure(
          httpStatus: http.statusCode,
          retryAfterMinutes: retryAfterMinutes(http.value(forHTTPHeaderField: "Retry-After"))
        )
      }

      guard data.count <= WidgetServerUpdateDefaults.maxBodyBytes else {
        // Asking again returns the same oversized body, so this is a failure the app has to fix
        // rather than one to back off from.
        VoltraLogger.widget.error(
          "Response is larger than \(WidgetServerUpdateDefaults.maxBodyBytes, privacy: .public) bytes"
        )
        return .httpFailure(httpStatus: http.statusCode, retryAfterMinutes: nil)
      }

      return .success(
        body: data,
        etag: http.value(forHTTPHeaderField: "ETag"),
        httpStatus: http.statusCode,
        nextIntervalMinutes: nextIntervalMinutes
      )
    } catch {
      return .networkFailure(message: error.localizedDescription)
    }
  }

  /// `Cache-Control: max-age=N`, in minutes, rounded down.
  static func maxAgeMinutes(_ header: String?) -> Int? {
    guard let header else { return nil }

    let pattern = try? NSRegularExpression(pattern: "max-age\\s*=\\s*(\\d+)", options: .caseInsensitive)
    let range = NSRange(header.startIndex ..< header.endIndex, in: header)

    guard let match = pattern?.firstMatch(in: header, range: range),
          let secondsRange = Range(match.range(at: 1), in: header),
          let seconds = Int(header[secondsRange])
    else {
      return nil
    }

    return seconds / 60
  }

  /// `Retry-After` as delta-seconds, in minutes, rounded up so we never retry early.
  static func retryAfterMinutes(_ header: String?) -> Int? {
    guard let seconds = header.flatMap({ Int($0.trimmingCharacters(in: .whitespaces)) }), seconds > 0 else {
      return nil
    }

    return (seconds + 59) / 60
  }
}
