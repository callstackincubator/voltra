import Foundation

enum VoltraDynamicLiveActivityBundleSource {
  enum LoadError: LocalizedError {
    case metroHTTP(Int)
    case nonUTF8
    case bakedBundleNotFound(definitionId: String)

    var errorDescription: String? {
      switch self {
      case let .metroHTTP(status):
        return "Metro HTTP \(status) while loading a Dynamic Live Activity bundle"
      case .nonUTF8:
        return "Dynamic Live Activity bundle was not UTF-8 text"
      case let .bakedBundleNotFound(definitionId):
        return "Production Dynamic Live Activity bundle missing for definitionId=\(definitionId)"
      }
    }
  }

  static func load(definitionId: String) throws -> String {
    #if DEBUG
      return try loadFromMetro(definitionId: definitionId)
    #else
      return try loadFromBakedAsset(definitionId: definitionId)
    #endif
  }

  private static func loadFromMetro(definitionId: String) throws -> String {
    let base = VoltraWidgetDefaults.devServerURL() ?? "http://localhost:8081"
    guard let url = URL(string: "\(base)/voltra/live-activities/\(definitionId).bundle?platform=ios&dev=true") else {
      throw LoadError.metroHTTP(-1)
    }
    let semaphore = DispatchSemaphore(value: 0)
    var result: Result<(Data, URLResponse), Error>?
    URLSession.shared.dataTask(with: url) { data, response, error in
      if let error {
        result = .failure(error)
      } else if let data, let response {
        result = .success((data, response))
      } else {
        result = .failure(LoadError.metroHTTP(-1))
      }
      semaphore.signal()
    }.resume()
    semaphore.wait()
    let (data, response) = try result!.get()
    if let httpResponse = response as? HTTPURLResponse, !(200 ... 299).contains(httpResponse.statusCode) {
      throw LoadError.metroHTTP(httpResponse.statusCode)
    }
    guard let source = String(data: data, encoding: .utf8) else {
      throw LoadError.nonUTF8
    }
    return source
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
