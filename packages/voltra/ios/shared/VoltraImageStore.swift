import Foundation
import UIKit

/// Utility for reading/writing preloaded images to App Group shared storage
public enum VoltraImageStore {
  private static let imageDirectoryName = "voltra_images"

  /// Get the shared container URL for storing images
  public static func imageDirectory() -> URL? {
    guard let groupId = VoltraConfig.groupIdentifier(),
          let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupId)
    else { return nil }

    return containerURL.appendingPathComponent(imageDirectoryName, isDirectory: true)
  }

  /// Ensure the image directory exists
  private static func ensureDirectoryExists() throws {
    guard let directory = imageDirectory() else {
      throw VoltraImageStoreError.appGroupNotConfigured
    }

    if !FileManager.default.fileExists(atPath: directory.path) {
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }
  }

  /// Save image data to App Group storage
  /// - Parameters:
  ///   - data: The image data to save
  ///   - key: The key/name to use for the image (will be used as assetName)
  public static func saveImage(_ data: Data, key: String) throws {
    try ensureDirectoryExists()

    guard let directory = imageDirectory() else {
      throw VoltraImageStoreError.appGroupNotConfigured
    }

    let sanitizedKey = sanitizeKey(key)
    let fileURL = directory.appendingPathComponent(sanitizedKey)

    // Write atomically to ensure the file is fully written before it becomes visible
    try data.write(to: fileURL, options: .atomic)
  }

  /// Load a preloaded image from App Group storage
  /// - Parameter key: The key/name of the image
  /// - Returns: The UIImage if found, nil otherwise
  public static func loadImage(key: String) -> UIImage? {
    guard let directory = imageDirectory() else { return nil }

    let sanitizedKey = sanitizeKey(key)
    let fileURL = directory.appendingPathComponent(sanitizedKey)

    guard FileManager.default.fileExists(atPath: fileURL.path),
          let data = try? Data(contentsOf: fileURL),
          let image = UIImage(data: data)
    else { return nil }

    return image
  }

  /// Check if a preloaded image exists
  /// - Parameter key: The key/name of the image
  /// - Returns: true if the image exists in App Group storage
  public static func imageExists(key: String) -> Bool {
    guard let directory = imageDirectory() else { return false }

    let sanitizedKey = sanitizeKey(key)
    let fileURL = directory.appendingPathComponent(sanitizedKey)

    return FileManager.default.fileExists(atPath: fileURL.path)
  }

  /// Remove a preloaded image from App Group storage
  /// - Parameter key: The key/name of the image to remove
  public static func removeImage(key: String) {
    guard let directory = imageDirectory() else { return }

    let sanitizedKey = sanitizeKey(key)
    let fileURL = directory.appendingPathComponent(sanitizedKey)

    try? FileManager.default.removeItem(at: fileURL)
  }

  /// Remove multiple preloaded images
  /// - Parameter keys: The keys/names of the images to remove
  public static func removeImages(keys: [String]) {
    for key in keys {
      removeImage(key: key)
    }
  }

  /// Clear all preloaded images from App Group storage
  public static func clearAll() {
    guard let directory = imageDirectory() else { return }

    try? FileManager.default.removeItem(at: directory)
  }

  /// Sanitize the key to be a valid filename
  private static func sanitizeKey(_ key: String) -> String {
    // Replace any characters that might cause issues in filenames
    let invalidChars = CharacterSet(charactersIn: "/\\:*?\"<>|")
    return key.components(separatedBy: invalidChars).joined(separator: "_")
  }
}

/// Errors that can occur during image store operations
public enum VoltraImageStoreError: Error, LocalizedError {
  case appGroupNotConfigured

  public var errorDescription: String? {
    switch self {
    case .appGroupNotConfigured:
      return "App Group not configured. Set 'groupIdentifier' in the Voltra config plugin."
    }
  }
}
