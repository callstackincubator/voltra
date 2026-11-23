import Foundation
@testable import VoltraSharedCore
import XCTest

final class DynamicWidgetLastGoodStoreTests: XCTestCase {
  private var directory: URL!
  private var store: DynamicWidgetLastGoodStore!

  override func setUp() {
    super.setUp()
    directory = FileManager.default.temporaryDirectory.appendingPathComponent("last-good-\(UUID().uuidString)")
    store = DynamicWidgetLastGoodStore(directoryURL: directory)
  }

  override func tearDown() {
    try? FileManager.default.removeItem(at: directory)
    super.tearDown()
  }

  private func key(
    _ id: String = "inbox",
    instance: String? = nil,
    family: String = "systemMedium",
    appearance: String = "light-fullColor-true"
  ) -> DynamicWidgetRenderKey {
    DynamicWidgetRenderKey(widgetId: id, instance: instance, family: family, appearance: appearance)
  }

  func testWritesAndReadsBack() {
    XCTAssertNil(store.read(key()))
    XCTAssertTrue(store.write(#"{"type":"text"}"#, for: key()))
    XCTAssertEqual(store.read(key()), #"{"type":"text"}"#)
  }

  func testTheSameOutputIsNotWrittenAgainButARemovedFileIs() throws {
    store.write("a", for: key())
    let url = try XCTUnwrap(FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil).first)
    let first = try FileManager.default.attributesOfItem(atPath: url.path)[.modificationDate] as? Date
    Thread.sleep(forTimeInterval: 0.05)
    store.write("a", for: key())
    XCTAssertEqual(try FileManager.default.attributesOfItem(atPath: url.path)[.modificationDate] as? Date, first)

    try FileManager.default.removeItem(at: url)
    store.write("a", for: key())
    XCTAssertEqual(store.read(key()), "a", "a file the app cleared is written again")
  }

  func testANodeOverTheCapIsNotStoredAndDoesNotEvictTheOlderOne() {
    store.write("small", for: key())
    let big = String(repeating: "x", count: DynamicWidgetLastGoodStore.maxBytes + 1)
    XCTAssertFalse(store.write(big, for: key()))
    XCTAssertEqual(store.read(key()), "small")
  }

  func testFamiliesAndInstancesOfOneWidgetDoNotShareAFile() {
    store.write("small", for: key(family: "systemSmall"))
    store.write("medium", for: key(family: "systemMedium"))
    store.write("a", for: key(instance: "aaa"))
    store.write("b", for: key(instance: "bbb"))
    XCTAssertEqual(store.read(key(family: "systemSmall")), "small")
    XCTAssertEqual(store.read(key(family: "systemMedium")), "medium")
    XCTAssertEqual(store.read(key(instance: "aaa")), "a")
    XCTAssertEqual(store.read(key(instance: "bbb")), "b")
    XCTAssertNil(store.read(key(family: "systemLarge")), "a family with no render of its own has none")
  }

  func testAppearancesOfOneFamilyDoNotShareAFile() {
    store.write("light", for: key(appearance: "light-fullColor-true"))
    store.write("dark", for: key(appearance: "dark-fullColor-true"))
    store.write("accented", for: key(appearance: "light-accented-true"))
    store.write("no-background", for: key(appearance: "light-fullColor-false"))
    XCTAssertEqual(store.read(key(appearance: "light-fullColor-true")), "light")
    XCTAssertEqual(store.read(key(appearance: "dark-fullColor-true")), "dark")
    XCTAssertEqual(store.read(key(appearance: "light-accented-true")), "accented")
    XCTAssertEqual(store.read(key(appearance: "light-fullColor-false")), "no-background")
    XCTAssertNil(store.read(key(appearance: "dark-accented-true")), "an appearance with no render of its own has none")

    store.remove(widgetId: "inbox")
    XCTAssertNil(store.read(key(appearance: "dark-fullColor-true")), "remove clears every appearance")
  }

  func testRemoveClearsEveryInstanceAndFamilyOfOneWidgetOnly() {
    store.write("1", for: key("inbox", family: "systemSmall"))
    store.write("2", for: key("inbox", instance: "aaa"))
    store.write("3", for: key("inbox-2"))
    store.remove(widgetId: "inbox")
    XCTAssertNil(store.read(key("inbox", family: "systemSmall")))
    XCTAssertNil(store.read(key("inbox", instance: "aaa")))
    XCTAssertEqual(store.read(key("inbox-2")), "3", "a widget whose id starts with another's is left alone")
  }

  func testWidgetIdsWithSeparatorsDoNotCollide() {
    store.write("x", for: key("a__b"))
    store.write("y", for: key("a"))
    store.remove(widgetId: "a")
    XCTAssertEqual(store.read(key("a__b")), "x")
  }
}
