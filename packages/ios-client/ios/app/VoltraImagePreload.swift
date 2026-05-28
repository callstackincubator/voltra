import Foundation
import os
import UIKit
import WebKit

// MARK: - Types

public struct PreloadImageOptions {
  public var url: String?
  public var svg: String?
  public var key: String
  public var method: String?
  public var headers: [String: String]?
  public var width: Int?
  public var height: Int?

  public init(_ dict: NSDictionary) {
    url = dict["url"] as? String
    svg = dict["svg"] as? String
    key = dict["key"] as? String ?? ""
    method = dict["method"] as? String
    headers = dict["headers"] as? [String: String]
    width = (dict["width"] as? NSNumber)?.intValue ?? dict["width"] as? Int
    height = (dict["height"] as? NSNumber)?.intValue ?? dict["height"] as? Int
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
  case invalidSource(key: String)
  case invalidResponse
  case httpError(statusCode: Int)
  case imageTooLarge(key: String, size: Int)
  case svgTooLarge(key: String, size: Int)
  case invalidSvgData(key: String)
  case invalidSvgDimensions(key: String)
  case invalidImageData(key: String)
  case appGroupNotConfigured

  var errorDescription: String? {
    switch self {
    case let .invalidURL(url):
      return "Invalid URL: \(url)"
    case let .invalidSource(key):
      return "Image '\(key)' must provide either url or svg"
    case .invalidResponse:
      return "Invalid response from server"
    case let .httpError(statusCode):
      return "HTTP error: \(statusCode)"
    case let .imageTooLarge(key, size):
      return "Image '\(key)' is too large: \(size) bytes " +
        "(max \(VoltraImagePreload.maxImageSizeInBytes) bytes for Live Activities)"
    case let .svgTooLarge(key, size):
      return "SVG '\(key)' is too large: \(size) bytes (max \(VoltraImagePreload.maxSvgSizeInBytes) bytes)"
    case let .invalidSvgData(key):
      return "Invalid SVG data for '\(key)'"
    case let .invalidSvgDimensions(key):
      return "SVG '\(key)' requires positive width and height"
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
  static let maxSvgSizeInBytes = 256 * 1024

  static func preloadImages(images: [PreloadImageOptions]) async throws -> PreloadImagesResult {
    var succeeded: [String] = []
    var failed: [PreloadImageFailure] = []

    for imageOptions in images {
      do {
        try await loadAndSaveImage(imageOptions)
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

  private static func loadAndSaveImage(_ options: PreloadImageOptions) async throws {
    guard let svg = options.svg?.trimmingCharacters(in: .whitespacesAndNewlines), !svg.isEmpty else {
      let data = try await downloadUrlImage(options)
      try saveImageData(data, key: options.key)
      return
    }

    let data = try await rasterizeSvg(svg, key: options.key, width: options.width, height: options.height)
    try saveImageData(data, key: options.key)
  }

  private static func saveImageData(_ data: Data, key: String) throws {
    if data.count >= maxImageSizeInBytes {
      throw PreloadError.imageTooLarge(key: key, size: data.count)
    }

    guard UIImage(data: data) != nil else {
      throw PreloadError.invalidImageData(key: key)
    }

    try VoltraImageStore.saveImage(data, key: key)
    VoltraLogger.image.info("Preloaded '\(key)' (\(data.count) bytes)")
  }

  private static func downloadUrlImage(_ options: PreloadImageOptions) async throws -> Data {
    guard let urlString = options.url?.trimmingCharacters(in: .whitespacesAndNewlines), !urlString.isEmpty else {
      throw PreloadError.invalidSource(key: options.key)
    }

    guard let url = URL(string: urlString) else {
      throw PreloadError.invalidURL(urlString)
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

    let contentType = httpResponse.value(forHTTPHeaderField: "Content-Type")
    if isSvgData(data, contentType: contentType, url: url) {
      guard data.count < maxSvgSizeInBytes else {
        throw PreloadError.svgTooLarge(key: options.key, size: data.count)
      }
      guard let svg = String(data: data, encoding: .utf8) else {
        throw PreloadError.invalidSvgData(key: options.key)
      }
      return try await rasterizeSvg(svg, key: options.key, width: options.width, height: options.height)
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

    return data
  }

  private static func isSvgData(_ data: Data, contentType: String?, url: URL) -> Bool {
    if contentType?.lowercased().contains("image/svg+xml") == true {
      return true
    }

    if url.pathExtension.lowercased() == "svg" {
      return true
    }

    guard let prefix = String(data: data.prefix(512), encoding: .utf8)?.lowercased() else {
      return false
    }

    return prefix.contains("<svg")
  }

  private static func validateSvg(_ svg: String, key: String) throws {
    let trimmed = svg.trimmingCharacters(in: .whitespacesAndNewlines)
    let lowercased = trimmed.lowercased()

    guard lowercased.contains("<svg") else {
      throw PreloadError.invalidSvgData(key: key)
    }

    if lowercased.contains("<script") ||
      lowercased.contains("javascript:") ||
      lowercased.contains("<iframe") ||
      lowercased.contains("<object") ||
      lowercased.contains("<embed") ||
      lowercased.contains("href=\"http") ||
      lowercased.contains("href='http") ||
      lowercased.contains("xlink:href=\"http") ||
      lowercased.contains("xlink:href='http")
    {
      throw PreloadError.invalidSvgData(key: key)
    }
  }

  @MainActor
  private static func rasterizeSvg(_ svg: String, key: String, width: Int?, height: Int?) async throws -> Data {
    let svgSize = svg.data(using: .utf8)?.count ?? 0
    guard svgSize < maxSvgSizeInBytes else {
      throw PreloadError.svgTooLarge(key: key, size: svgSize)
    }

    try validateSvg(svg, key: key)

    guard let width, let height, width > 0, height > 0 else {
      throw PreloadError.invalidSvgDimensions(key: key)
    }

    let size = CGSize(width: width, height: height)
    let webView = WKWebView(frame: CGRect(origin: .zero, size: size))
    webView.isOpaque = false
    webView.backgroundColor = .clear
    webView.scrollView.backgroundColor = .clear
    webView.scrollView.isScrollEnabled = false

    let navigationDelegate = SvgNavigationDelegate()
    webView.navigationDelegate = navigationDelegate

    let html = """
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=\(width), height=\(height), initial-scale=1.0">
        <style>
          html, body {
            margin: 0;
            padding: 0;
            width: \(width)px;
            height: \(height)px;
            overflow: hidden;
            background: transparent;
          }
          svg { display: block; width: \(width)px; height: \(height)px; }
        </style>
      </head>
      <body>\(svg)</body>
    </html>
    """

    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      navigationDelegate.continuation = continuation
      webView.loadHTMLString(html, baseURL: nil)
    }

    let configuration = WKSnapshotConfiguration()
    configuration.rect = CGRect(origin: .zero, size: size)
    configuration.snapshotWidth = NSNumber(value: width)

    let image: UIImage = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<UIImage, Error>) in
      webView.takeSnapshot(with: configuration) { image, error in
        if let error {
          continuation.resume(throwing: error)
        } else if let image {
          continuation.resume(returning: image)
        } else {
          continuation.resume(throwing: PreloadError.invalidSvgData(key: key))
        }
      }
    }

    guard let pngData = image.pngData() else {
      throw PreloadError.invalidImageData(key: key)
    }

    return pngData
  }
}

private final class SvgNavigationDelegate: NSObject, WKNavigationDelegate {
  var continuation: CheckedContinuation<Void, Error>?

  func webView(_: WKWebView, didFinish _: WKNavigation!) {
    continuation?.resume()
    continuation = nil
  }

  func webView(_: WKWebView, didFail _: WKNavigation!, withError error: Error) {
    continuation?.resume(throwing: error)
    continuation = nil
  }

  func webView(_: WKWebView, didFailProvisionalNavigation _: WKNavigation!, withError error: Error) {
    continuation?.resume(throwing: error)
    continuation = nil
  }
}
