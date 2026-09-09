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
  /// A `2xx` whose body is over `WidgetServerUpdateDefaults.maxBodyBytes`. Kept apart from
  /// `httpFailure` because the server did answer: this is a body the device refuses, so it is
  /// reported as a parse failure and asking again is pointless.
  case tooLarge(httpStatus: Int)

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
  /// Refuses to leave the host the app configured, so an `Authorization` header or a request body
  /// cannot be replayed somewhere the app never agreed to send it.
  private final class SameHostRedirectDelegate: NSObject, URLSessionTaskDelegate {
    func urlSession(
      _: URLSession,
      task: URLSessionTask,
      willPerformHTTPRedirection _: HTTPURLResponse,
      newRequest request: URLRequest,
      completionHandler: @escaping (URLRequest?) -> Void
    ) {
      guard let originalHost = task.originalRequest?.url?.host,
            let originalScheme = task.originalRequest?.url?.scheme,
            let nextHost = request.url?.host,
            nextHost.caseInsensitiveCompare(originalHost) == .orderedSame,
            request.url?.scheme == originalScheme
      else {
        VoltraLogger.widget.warning("Refusing cross-host redirect for a widget server request")
        completionHandler(nil)
        return
      }

      completionHandler(request)
    }
  }

  private static let redirectDelegate = SameHostRedirectDelegate()

  public static func fetch(
    _ request: URLRequest,
    session: URLSession = .shared
  ) async -> WidgetServerFetchResult {
    do {
      // bytes(for:) rather than data(for:) so an oversized body is abandoned mid-stream. A widget
      // extension has a 30 MB ceiling for the whole render, and buffering first would spend it
      // before we ever got to check.
      let (stream, response) = try await session.bytes(for: request, delegate: redirectDelegate)

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

      guard let body = try await readBody(stream) else {
        // Asking again returns the same oversized body, so this is a failure the app has to fix
        // rather than one to back off from.
        VoltraLogger.widget.error(
          "Response is larger than \(WidgetServerUpdateDefaults.maxBodyBytes, privacy: .public) bytes"
        )
        return .tooLarge(httpStatus: http.statusCode)
      }

      return .success(
        body: body,
        etag: http.value(forHTTPHeaderField: "ETag"),
        httpStatus: http.statusCode,
        nextIntervalMinutes: nextIntervalMinutes
      )
    } catch {
      return .networkFailure(message: error.localizedDescription)
    }
  }

  /// Returns nil as soon as the body passes the cap, without holding the rest of it.
  private static func readBody(_ stream: URLSession.AsyncBytes) async throws -> Data? {
    var body = Data()
    body.reserveCapacity(16 * 1024)

    for try await byte in stream {
      if body.count >= WidgetServerUpdateDefaults.maxBodyBytes {
        return nil
      }

      body.append(byte)
    }

    return body
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

  /// `Retry-After`, in minutes, rounded up so we never retry early.
  ///
  /// The header is delta-seconds or an HTTP date; both are in the wild, so both are read.
  static func retryAfterMinutes(_ header: String?, now: Date = Date()) -> Int? {
    guard let value = header?.trimmingCharacters(in: .whitespaces), !value.isEmpty else {
      return nil
    }

    if let seconds = Int(value) {
      return seconds > 0 ? (seconds + 59) / 60 : nil
    }

    guard let date = httpDateFormatter.date(from: value) else {
      return nil
    }

    let seconds = Int(date.timeIntervalSince(now))

    return seconds > 0 ? (seconds + 59) / 60 : nil
  }

  private static let httpDateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone(identifier: "GMT")
    formatter.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
    return formatter
  }()
}
