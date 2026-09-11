@testable import VoltraSharedCore
import XCTest

final class BrotliCompressionTests: XCTestCase {
  func testRoundTripsPayloadThatDecompressesToMoreThanEightTimesItsCompressedSize() throws {
    // A Live Activity payload is mostly repeated component and style keys, so brotli routinely
    // shrinks it far more than 8x. The decoder used to size its output buffer at 8x the compressed
    // bytes and silently returned truncated JSON for anything that compressed better than that.
    let item = #"{"t":1,"s":{"padding":16,"borderRadius":18,"backgroundColor":"#101828"},"c":"Driver arrived"}"#
    let json = "[" + Array(repeating: item, count: 400).joined(separator: ",") + "]"

    let compressed = try BrotliCompression.compress(jsonString: json)
    let compressedByteCount = try XCTUnwrap(Data(base64Encoded: compressed)).count

    let decompressed = try BrotliCompression.decompress(base64String: compressed)

    XCTAssertEqual(decompressed, json)
    XCTAssertGreaterThan(
      decompressed.utf8.count,
      compressedByteCount * 8,
      "Input must compress better than 8x so the test exercises the old truncation failure mode"
    )
  }

  func testRoundTripsShortPayload() throws {
    let json = #"{"v":1,"ls":{"t":0,"c":"Hello, world!"}}"#

    let compressed = try BrotliCompression.compress(jsonString: json)

    XCTAssertEqual(try BrotliCompression.decompress(base64String: compressed), json)
  }

  func testRejectsInvalidBase64() {
    XCTAssertThrowsError(try BrotliCompression.decompress(base64String: "not base64!")) { error in
      guard case BrotliCompressionError.base64DecodingFailed = error else {
        return XCTFail("Expected base64DecodingFailed, got \(error)")
      }
    }
  }

  func testRejectsBytesThatAreNotABrotliStream() {
    let notBrotli = Data("definitely not a brotli stream".utf8).base64EncodedString()

    XCTAssertThrowsError(try BrotliCompression.decompress(base64String: notBrotli)) { error in
      guard case BrotliCompressionError.decompressionFailed = error else {
        return XCTFail("Expected decompressionFailed, got \(error)")
      }
    }
  }
}
