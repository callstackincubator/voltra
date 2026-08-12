import Foundation

enum VoltraDynamicLiveActivityBundleSource {
  private static let metroTimeout: TimeInterval = 1

  enum LoadError: LocalizedError {
    case metroHTTP(Int)
    case metroTimeout
    case nonUTF8
    case bakedBundleNotFound(definitionId: String)
    case cacheUnavailable

    var errorDescription: String? {
      switch self {
      case let .metroHTTP(status):
        return "Metro HTTP \(status) while loading a Dynamic Live Activity bundle"
      case .metroTimeout:
        return "Metro timed out while loading a Dynamic Live Activity bundle"
      case .nonUTF8:
        return "Dynamic Live Activity bundle was not UTF-8 text"
      case let .bakedBundleNotFound(definitionId):
        return "Production Dynamic Live Activity bundle missing for definitionId=\(definitionId)"
      case .cacheUnavailable:
        return "Dynamic Live Activity debug cache is unavailable"
      }
    }
  }

  static func load(definitionId: String) throws -> String {
    #if DEBUG
      if let cached = try? loadFromDebugCache(definitionId: definitionId) {
        return cached
      }
      return try loadFromMetroBounded(definitionId: definitionId)
    #else
      return try loadFromBakedAsset(definitionId: definitionId)
    #endif
  }

  /// App-side preflight and Fast Refresh use an asynchronous fetch, then publish
  /// the source into the App Group cache consumed by the extension process.
  static func loadForApp(definitionId: String) async throws -> String {
    #if DEBUG
      let request = try metroRequest(definitionId: definitionId)
      let (data, response) = try await URLSession.shared.data(for: request)
      let source = try validateMetroResponse(data: data, response: response)
      try saveToDebugCache(source, definitionId: definitionId)
      return source
    #else
      return try loadFromBakedAsset(definitionId: definitionId)
    #endif
  }

  /// A cheap token that changes whenever the bytes behind `load` change, used to
  /// invalidate the render cache. In DEBUG it is the debug-cache file's
  /// modification time, which the app process rewrites on every hot reload; the
  /// extension reads only the file's metadata, never decoding the whole bundle.
  /// In release the baked asset never changes at runtime, so the token is
  /// constant and the render cache stays valid for the process lifetime.
  static func revision(definitionId: String) -> String {
    #if DEBUG
      guard
        let url = try? debugCacheURL(definitionId: definitionId),
        let modified = (try? FileManager.default.attributesOfItem(atPath: url.path))?[.modificationDate] as? Date
      else {
        return ""
      }
      return String(modified.timeIntervalSince1970)
    #else
      return "baked"
    #endif
  }

  private static func metroRequest(definitionId: String) throws -> URLRequest {
    let base = VoltraWidgetDefaults.devServerURL() ?? "http://localhost:8081"
    guard let url = URL(string: "\(base)/voltra/live-activities/\(definitionId).bundle?platform=ios&dev=true") else {
      throw LoadError.metroHTTP(-1)
    }
    var request = URLRequest(url: url)
    request.timeoutInterval = metroTimeout
    return request
  }

  /// WidgetKit rendering is synchronous. On a cold debug process we permit one
  /// short, bounded bootstrap request; all subsequent renders read the App Group
  /// cache and never wait on the network.
  private static func loadFromMetroBounded(definitionId: String) throws -> String {
    let request = try metroRequest(definitionId: definitionId)
    let semaphore = DispatchSemaphore(value: 0)
    var result: Result<(Data, URLResponse), Error>?
    let configuration = URLSessionConfiguration.ephemeral
    configuration.timeoutIntervalForRequest = metroTimeout
    configuration.timeoutIntervalForResource = metroTimeout
    let session = URLSession(configuration: configuration)
    let task = session.dataTask(with: request) { data, response, error in
      if let error {
        result = .failure(error)
      } else if let data, let response {
        result = .success((data, response))
      } else {
        result = .failure(LoadError.metroHTTP(-1))
      }
      semaphore.signal()
    }
    task.resume()
    guard semaphore.wait(timeout: .now() + metroTimeout) == .success else {
      task.cancel()
      session.invalidateAndCancel()
      throw LoadError.metroTimeout
    }
    session.finishTasksAndInvalidate()
    guard let result else { throw LoadError.metroTimeout }
    let (data, response) = try result.get()
    let source = try validateMetroResponse(data: data, response: response)
    try saveToDebugCache(source, definitionId: definitionId)
    return source
  }

  private static func validateMetroResponse(data: Data, response: URLResponse) throws -> String {
    if let httpResponse = response as? HTTPURLResponse, !(200 ... 299).contains(httpResponse.statusCode) {
      throw LoadError.metroHTTP(httpResponse.statusCode)
    }
    guard let source = String(data: data, encoding: .utf8) else {
      throw LoadError.nonUTF8
    }
    return source
  }

  private static func loadFromDebugCache(definitionId: String) throws -> String {
    try String(contentsOf: debugCacheURL(definitionId: definitionId), encoding: .utf8)
  }

  private static func saveToDebugCache(_ source: String, definitionId: String) throws {
    try Data(source.utf8).write(to: debugCacheURL(definitionId: definitionId), options: .atomic)
  }

  private static func debugCacheURL(definitionId: String) throws -> URL {
    guard
      let group = VoltraConfig.groupIdentifier(),
      let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)
    else {
      throw LoadError.cacheUnavailable
    }
    return container.appendingPathComponent("voltra-live-activity-debug-\(definitionId).bundle")
  }

  private static func loadFromBakedAsset(definitionId: String) throws -> String {
    guard
      let url = Bundle.main.url(forResource: "voltra-live-activity-\(definitionId)", withExtension: "bundle"),
      let source = try? String(contentsOf: url, encoding: .utf8)
    else {
      throw LoadError.bakedBundleNotFound(definitionId: definitionId)
    }
    return source
  }
}
