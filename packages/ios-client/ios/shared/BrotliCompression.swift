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

    // Compress using brotli level 2 (iOS only supports level 2)
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

    // Estimate decompressed size (brotli typically compresses to 20-30% of original)
    // Using 8x to ensure we have enough buffer space
    let estimatedSize = compressedData.count * 8
    let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: estimatedSize)
    defer { buffer.deallocate() }

    // Decompress using brotli algorithm
    let decompressedSize = compression_decode_buffer(
      buffer,
      estimatedSize,
      compressedData.withUnsafeBytes { $0.baseAddress!.assumingMemoryBound(to: UInt8.self) },
      compressedData.count,
      nil,
      COMPRESSION_BROTLI
    )

    guard decompressedSize > 0 else {
      throw BrotliCompressionError.decompressionFailed
    }

    // Convert decompressed data to String
    let decompressedData = Data(bytes: buffer, count: decompressedSize)
    guard let jsonString = String(data: decompressedData, encoding: .utf8) else {
      throw BrotliCompressionError.stringConversionFailed
    }
    return jsonString
  }
}
