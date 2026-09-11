import Compression
import Foundation

public enum BrotliCompressionError: Error {
  case encodingFailed
  case compressionFailed(Int)
  case base64DecodingFailed
  case decompressionFailed
  case stringConversionFailed
}

public enum BrotliCompression {
  /// Compresses a JSON string using brotli compression and returns a base64-encoded string
  /// - Parameter jsonString: The JSON string to compress
  /// - Returns: Base64-encoded compressed data
  /// - Throws: BrotliCompressionError if compression fails
  public static func compress(jsonString: String) throws -> String {
    guard let jsonData = jsonString.data(using: .utf8) else {
      throw BrotliCompressionError.encodingFailed
    }

    let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: jsonData.count * 2)
    defer { buffer.deallocate() }

    // Compress using brotli level 2 (Apple's encoder has a single fixed level). The decoder
    // accepts any quality, so payloads produced by the server at quality 11 decode unchanged.
    let compressedSize = compression_encode_buffer(
      buffer,
      jsonData.count * 2,
      jsonData.withUnsafeBytes { $0.baseAddress!.assumingMemoryBound(to: UInt8.self) },
      jsonData.count,
      nil,
      COMPRESSION_BROTLI
    )

    guard compressedSize > 0 else {
      throw BrotliCompressionError.compressionFailed(jsonData.count)
    }

    // Convert compressed data to base64 string
    let compressedData = Data(bytes: buffer, count: compressedSize)
    return compressedData.base64EncodedString()
  }

  /// Decompresses a base64-encoded brotli-compressed string
  /// - Parameter base64String: Base64-encoded compressed data
  /// - Returns: Decompressed JSON string
  /// - Throws: BrotliCompressionError if decompression fails
  public static func decompress(base64String: String) throws -> String {
    // Decode base64 to Data
    guard let compressedData = Data(base64Encoded: base64String) else {
      throw BrotliCompressionError.base64DecodingFailed
    }

    // Foundation sizes the output buffer itself, so the result is complete however large the
    // decompressed payload is relative to the compressed bytes. A fixed multiple of the input
    // (the previous approach) silently truncated payloads that compressed better than it assumed.
    let decompressedData: Data
    do {
      decompressedData = try (compressedData as NSData).decompressed(using: .brotli) as Data
    } catch {
      throw BrotliCompressionError.decompressionFailed
    }

    guard !decompressedData.isEmpty else {
      throw BrotliCompressionError.decompressionFailed
    }

    // Convert decompressed data to String
    guard let jsonString = String(data: decompressedData, encoding: .utf8) else {
      throw BrotliCompressionError.stringConversionFailed
    }
    return jsonString
  }
}
