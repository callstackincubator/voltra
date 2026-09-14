@testable import VoltraSharedCore
import XCTest

/// The canonical serialization and instance key (ADR 0007).
///
/// `testCrossPlatformKeyVector` pins one configuration's key so Android and iOS can be checked to
/// agree without running either at the same time: `{"city":"London","units":"metric"}` must hash
/// to `eb69b5d1` on both platforms. The algorithm is FNV-1a, 32-bit, over the UTF-8 bytes of the
/// canonical string, rendered as 8 lowercase hex digits — see `WidgetCanonicalConfiguration.swift`.
final class WidgetCanonicalConfigurationTests: XCTestCase {
  func testCrossPlatformKeyVector() {
    let configuration = ["city": "London", "units": "metric"]

    XCTAssertEqual(WidgetCanonicalConfiguration.canonicalize(configuration), #"{"city":"London","units":"metric"}"#)
    XCTAssertEqual(WidgetCanonicalConfiguration.key(configuration), "eb69b5d1")
  }

  func testKeyOrderIndependenceTheSameMapProducesTheSameKeyRegardlessOfInsertionOrder() {
    let a = ["city": "London", "units": "metric"]
    let b = ["units": "metric", "city": "London"]

    XCTAssertEqual(WidgetCanonicalConfiguration.key(a), WidgetCanonicalConfiguration.key(b))
    XCTAssertEqual(WidgetCanonicalConfiguration.canonicalize(a), WidgetCanonicalConfiguration.canonicalize(b))
  }

  func testIdenticalMapsProduceIdenticalOutput() {
    let a = ["a": "1", "b": "2"]
    let b = ["b": "2", "a": "1"]

    XCTAssertEqual(WidgetCanonicalConfiguration.canonicalize(a), WidgetCanonicalConfiguration.canonicalize(b))
    XCTAssertEqual(WidgetCanonicalConfiguration.key(a), WidgetCanonicalConfiguration.key(b))
  }

  func testAChangedValueChangesTheKey() {
    let london = ["city": "London", "units": "metric"]
    let paris = ["city": "Paris", "units": "metric"]

    XCTAssertEqual(WidgetCanonicalConfiguration.key(london), "eb69b5d1")
    XCTAssertEqual(WidgetCanonicalConfiguration.key(paris), "8e22a4e8")
    XCTAssertNotEqual(WidgetCanonicalConfiguration.key(london), WidgetCanonicalConfiguration.key(paris))
  }

  func testNoInstanceOrConfigurationForAnEmptyMap() {
    XCTAssertNil(WidgetCanonicalConfiguration.canonicalize([:]))
    XCTAssertNil(WidgetCanonicalConfiguration.key([:]))
  }

  func testKeysAreSortedByCodePointNotByLocaleCollation() {
    let configuration = ["Z": "1", "a": "2"]

    XCTAssertEqual(WidgetCanonicalConfiguration.canonicalize(configuration), #"{"Z":"1","a":"2"}"#)
  }

  func testSerializationHasNoWhitespaceAndValuesAreJSONStrings() {
    let configuration = ["q": "a b", "n": "42"]

    XCTAssertEqual(WidgetCanonicalConfiguration.canonicalize(configuration), #"{"n":"42","q":"a b"}"#)
  }
}
