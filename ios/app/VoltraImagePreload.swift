import ExpoModulesCore
import Foundation
import os
import UIKit

// MARK: - Types

/// Options for preloading a single image
public struct PreloadImageOptions: Record {
  /// The URL to download the image from
  @Field
  public var url: String

  /// The key to use when referencing this image (used as assetName)
  @Field
  public var key: String

  /// HTTP method to use (GET, POST, PUT). Defaults to GET.
  @Field
  public var method: String?

  /// Optional HTTP headers to include in the request
  @Field
  public var headers: [String: String]?

  public init() {}
}

/// Result of a failed image preload
public struct PreloadImageFailure: Record {
  @Field
  public var key: String

  @Field
  public var error: String

  public init() {}

  public init(key: String, error: String) {
    self.key = key
    self.error = error
  }
}

/// Result of preloading images
public struct PreloadImagesResult: Record {
  @Field
  public var succeeded: [String]

  @Field
  public var failed: [PreloadImageFailure]

  public init() {}

  public init(succeeded: [String], failed: [PreloadImageFailure]) {
    self.succeeded = succeeded
    self.failed = failed
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

  static func preloadImages(images: [PreloadImageOptions]) async -> PreloadImagesResult {
    await withTaskGroup(of: Result<String, PreloadImageFailure>.self) { group in
      for imageOptions in images {
        group.addTask {
          do {
            try await downloadAndSaveImage(imageOptions)
            return .success(imageOptions.key)
          } catch {
            return .failure(PreloadImageFailure(key: imageOptions.key, error: error.localizedDescription))
          }
        }
      }

      var succeeded: [String] = []
      var failed: [PreloadImageFailure] = []

      for await result in group {
        switch result {
        case let .success(key): succeeded.append(key)
        case let .failure(failure): failed.append(failure)
        }
      }

      return PreloadImagesResult(succeeded: succeeded, failed: failed)
    }
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
