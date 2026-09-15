@testable import VoltraSharedCore
import XCTest

final class VoltraConfigTests: XCTestCase {
  func testReadsVoltraVersionFromInfoPlist() throws {
    let bundle = try makeBundle(infoPlist: [VoltraStorageKeys.voltraVersion: "9.8.7"])

    XCTAssertEqual(VoltraConfig.voltraVersion(bundle: bundle), "9.8.7")
  }

  func testFallsBackToUnknownWhenVoltraVersionIsAbsent() throws {
    // A widget extension built before Voltra started writing the key, or an Info.plist the app
    // owns rather than Voltra. Reporting "unknown" mirrors the `appVersion` fallback.
    let bundle = try makeBundle(infoPlist: ["CFBundleShortVersionString": "1.2.3"])

    XCTAssertEqual(VoltraConfig.voltraVersion(bundle: bundle), VoltraConfig.unknownVoltraVersion)
  }

  func testFallsBackToUnknownForUnusableVoltraVersionValues() {
    // An empty or non-string `Voltra_Version` means generation went wrong; "unknown" is more
    // honest than surfacing "" to `env.build.voltraVersion`.
    XCTAssertEqual(VoltraConfig.normalizeVoltraVersion(nil), "unknown")
    XCTAssertEqual(VoltraConfig.normalizeVoltraVersion(""), "unknown")
    XCTAssertEqual(VoltraConfig.normalizeVoltraVersion(3), "unknown")
  }

  func testKeepsWellFormedVoltraVersionValues() {
    XCTAssertEqual(VoltraConfig.normalizeVoltraVersion("2.2.0"), "2.2.0")
    XCTAssertEqual(VoltraConfig.normalizeVoltraVersion("2.3.0-beta.1"), "2.3.0-beta.1")
  }

  /// Builds a throwaway bundle on disk so the Info.plist lookup runs for real rather than against
  /// a stubbed `Bundle`.
  private func makeBundle(infoPlist: [String: Any]) throws -> Bundle {
    let bundlePath = URL(fileURLWithPath: NSTemporaryDirectory())
      .appendingPathComponent("voltra-config-tests-\(UUID().uuidString)")
      .appendingPathComponent("Stub.bundle")

    try FileManager.default.createDirectory(at: bundlePath, withIntermediateDirectories: true)
    addTeardownBlock {
      try? FileManager.default.removeItem(at: bundlePath.deletingLastPathComponent())
    }

    let data = try PropertyListSerialization.data(fromPropertyList: infoPlist, format: .xml, options: 0)
    try data.write(to: bundlePath.appendingPathComponent("Info.plist"))

    return try XCTUnwrap(Bundle(url: bundlePath))
  }
}
