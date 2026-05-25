import Foundation
import os
import UIKit

// MARK: - Types

public struct PreloadImageOptions {
  public var url: String
  public var key: String
  public var method: String?
  public var headers: [String: String]?

  public init(_ dict: NSDictionary) {
    url = dict["url"] as? String ?? ""
    key = dict["key"] as? String ?? ""
    method = dict["method"] as? String
    headers = dict["headers"] as? [String: String]
  }
}

public struct PreloadImageFailure {
  public var key: String
  public var error: String

  public init(key: String, error: String) {
    self.key = key
    self.error = error
  }

  public func toDictionary() -> NSDictionary {
    ["key": key, "error": error]
  }
}

public struct PreloadImagesResult {
  public var succeeded: [String]
  public var failed: [PreloadImageFailure]

  public init(succeeded: [String], failed: [PreloadImageFailure]) {
    self.succeeded = succeeded
    self.failed = failed
  }

  public func toDictionary() -> NSDictionary {
    ["succeeded": succeeded, "failed": failed.map { $0.toDictionary() }]
  }
}

// MARK: - Errors

/// Errors that can occur during image preloading
enum PreloadError: Error, LocalizedError {
  case invalidURL(String)
  case invalidResponse
  case httpError(statusCode: Int)
  case imageTooLarge(key: String, size: Int)
  case invalidImageData(key: String)
  case appGroupNotConfigured

  var errorDescription: String? {
    switch self {
    case let .invalidURL(url):
      return "Invalid URL: \(url)"
    case .invalidResponse:
      return "Invalid response from server"
    case let .httpError(statusCode):
      return "HTTP error: \(statusCode)"
    case let .imageTooLarge(key, size):
      return "Image '\(key)' is too large: \(size) bytes (max \(VoltraImagePreload.maxImageSizeInBytes) bytes for Live Activities)"
    case let .invalidImageData(key):
      return "Invalid image data for '\(key)'"
    case .appGroupNotConfigured:
      return "App Group not configured. Set 'groupIdentifier' in the Voltra config plugin."
    }
  }
}

// MARK: - Namespace

enum VoltraImagePreload {
  static let maxImageSizeInBytes = 4096

  static func preloadImages(images: [PreloadImageOptions]) async throws -> PreloadImagesResult {
    var succeeded: [String] = []
    var failed: [PreloadImageFailure] = []

    for imageOptions in images {
      do {
        try await downloadAndSaveImage(imageOptions)
        succeeded.append(imageOptions.key)
      } catch {
        failed.append(PreloadImageFailure(key: imageOptions.key, error: error.localizedDescription))
      }
    }

    return PreloadImagesResult(succeeded: succeeded, failed: failed)
  }

  static func clearPreloadedImages(keys: [String]?) async {
    if let keys = keys, !keys.isEmpty {
      VoltraImageStore.removeImages(keys: keys)
      VoltraLogger.image.info("Cleared preloaded images: \(keys.joined(separator: ", "))")
    } else {
      VoltraImageStore.clearAll()
      VoltraLogger.image.info("Cleared all preloaded images")
    }
  }

  // MARK: - Private

  private static func downloadAndSaveImage(_ options: PreloadImageOptions) async throws {
    guard let url = URL(string: options.url) else {
      throw PreloadError.invalidURL(options.url)
    }

    var request = URLRequest(url: url)
    request.httpMethod = options.method ?? "GET"

    if let headers = options.headers {
      for (key, value) in headers {
        request.setValue(value, forHTTPHeaderField: key)
      }
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
      throw PreloadError.invalidResponse
    }

    guard (200 ... 299).contains(httpResponse.statusCode) else {
      throw PreloadError.httpError(statusCode: httpResponse.statusCode)
    }

    if let contentLengthString = httpResponse.value(forHTTPHeaderField: "Content-Length"),
       let contentLength = Int(contentLengthString)
    {
      if contentLength >= maxImageSizeInBytes {
        throw PreloadError.imageTooLarge(key: options.key, size: contentLength)
      }
    }

    if data.count >= maxImageSizeInBytes {
      throw PreloadError.imageTooLarge(key: options.key, size: data.count)
    }

    guard UIImage(data: data) != nil else {
      throw PreloadError.invalidImageData(key: options.key)
    }

    try VoltraImageStore.saveImage(data, key: options.key)
    VoltraLogger.image.info("Preloaded '\(options.key)' (\(data.count) bytes)")
  }
}
