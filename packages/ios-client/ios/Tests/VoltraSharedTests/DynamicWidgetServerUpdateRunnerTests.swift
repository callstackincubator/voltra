@testable import VoltraSharedCore
import XCTest

/// The ADR 0002 failure table, one row at a time. Every collaborator is a fake, so what is under
/// test is the decision — commit, keep, retry, give up — and nothing else.
final class DynamicWidgetServerUpdateRunnerTests: XCTestCase {
  private let scope = WidgetScope.of("portfolio")

  private final class Recorder {
    var committed: [String] = []
    var successes = 0
    var failures: [(String, Int?)] = []
    var disabledFor: WidgetScope?
    var etags: [(String, String, String?)] = []
    var sentEtag: String?
    var commitThrows = false
  }

  private struct CommitFailure: Error {}

  private func settings(url: String? = "https://api.example.com/portfolio", enabled: Bool = true)
    -> ResolvedWidgetServerSettings
  {
    ResolvedWidgetServerSettings(
      url: url,
      intervalMinutes: 15,
      enabled: enabled,
      method: "GET",
      query: [:],
      headers: [:],
      body: nil
    )
  }

  private func runner(
    _ recorder: Recorder,
    settings: ResolvedWidgetServerSettings? = nil,
    result: WidgetServerFetchResult = .success(body: Data("{}".utf8), etag: nil, httpStatus: 200, nextIntervalMinutes: nil),
    trialRenders: Bool = true,
    revisions: [Int] = [1, 1],
    storedEtag: String? = nil
  ) -> DynamicWidgetServerUpdateRunner {
    var remaining = revisions
    let resolved = settings ?? self.settings()

    return DynamicWidgetServerUpdateRunner(
      resolveSettings: { _ in resolved },
      currentRevision: { _ in remaining.isEmpty ? revisions.last! : remaining.removeFirst() },
      readEtag: { _, _ in storedEtag },
      fetch: { _, _, etag in
        recorder.sentEtag = etag
        return result
      },
      writeEtag: { recorder.etags.append(($0.widgetId, $1, $2)) },
      trialRender: { _, _ in trialRenders },
      commitProps: { _, props in
        if recorder.commitThrows {
          throw CommitFailure()
        }
        recorder.committed.append(props)
      },
      recordSuccess: { _, _, _ in recorder.successes += 1 },
      recordFailure: { _, error, status in recorder.failures.append((error, status)) },
      markDisabled: {
        scope, enabled in if !enabled {
          recorder.disabledFor = scope
        }
      },
      now: { Date(timeIntervalSince1970: 1) }
    )
  }

  func testCommitsPropsThatFetchParseAndRender() async {
    let recorder = Recorder()
    let outcome = await runner(
      recorder,
      result: .success(body: Data(#"{"total":42}"#.utf8), etag: "\"abc\"", httpStatus: 200, nextIntervalMinutes: nil)
    ).run(scope)

    XCTAssertEqual(outcome, .committed)
    XCTAssertEqual(recorder.committed, [#"{"total":42}"#])
    XCTAssertEqual(recorder.successes, 1)
  }

  func testStoresTheEtagAgainstTheUrlItCameFrom() async {
    let recorder = Recorder()
    _ = await runner(
      recorder,
      result: .success(body: Data("{}".utf8), etag: "\"abc\"", httpStatus: 200, nextIntervalMinutes: nil)
    ).run(scope)

    XCTAssertEqual(recorder.etags.count, 1)
    XCTAssertEqual(recorder.etags[0].1, "https://api.example.com/portfolio")
    XCTAssertEqual(recorder.etags[0].2, "\"abc\"")
  }

  func testSendsTheStoredEtagSoAnUnchangedResponseCostsNothing() async {
    let recorder = Recorder()
    _ = await runner(recorder, storedEtag: "\"abc\"").run(scope)

    XCTAssertEqual(recorder.sentEtag, "\"abc\"")
  }

  func testTreats304AsFreshWithoutTouchingTheProps() async {
    let recorder = Recorder()
    let outcome = await runner(recorder, result: .notModified(nextIntervalMinutes: nil)).run(scope)

    XCTAssertEqual(outcome, .committed)
    XCTAssertTrue(recorder.committed.isEmpty)
    XCTAssertEqual(recorder.successes, 1)
  }

  func testDoesNotCommitPropsTheWidgetCannotRender() async {
    let recorder = Recorder()
    let outcome = await runner(
      recorder,
      result: .success(body: Data(#"{"total":42}"#.utf8), etag: nil, httpStatus: 200, nextIntervalMinutes: nil),
      trialRenders: false
    ).run(scope)

    XCTAssertEqual(outcome, .failed)
    XCTAssertTrue(recorder.committed.isEmpty)
    XCTAssertEqual(recorder.failures.first?.0, DynamicWidgetServerStatus.errorRender)
  }

  func testDoesNotCommitABodyThatIsNotProps() async {
    let recorder = Recorder()
    let outcome = await runner(
      recorder,
      result: .success(body: Data(#"{"v":1,"variants":{}}"#.utf8), etag: nil, httpStatus: 200, nextIntervalMinutes: nil)
    ).run(scope)

    XCTAssertEqual(outcome, .failed)
    XCTAssertTrue(recorder.committed.isEmpty)
    XCTAssertEqual(recorder.failures.first?.0, DynamicWidgetServerStatus.errorParse)
  }

  func testKeepsThePreviousPropsWhenTheCommitItselfFails() async {
    let recorder = Recorder()
    recorder.commitThrows = true

    let outcome = await runner(recorder).run(scope)

    XCTAssertEqual(outcome, .failed)
    XCTAssertEqual(recorder.successes, 0)
    XCTAssertTrue(recorder.etags.isEmpty)
  }

  func testRetriesANetworkFailureAndKeepsThePreviousProps() async {
    let recorder = Recorder()
    let outcome = await runner(recorder, result: .networkFailure(message: "timeout")).run(scope)

    XCTAssertEqual(outcome, .retry)
    XCTAssertTrue(recorder.committed.isEmpty)
    XCTAssertEqual(recorder.failures.first?.0, DynamicWidgetServerStatus.errorNetwork)
  }

  func testRetriesA5xxAndA429() async {
    let outcome503 = await runner(Recorder(), result: .httpFailure(httpStatus: 503, retryAfterMinutes: 2)).run(scope)
    let outcome429 = await runner(Recorder(), result: .httpFailure(httpStatus: 429, retryAfterMinutes: nil)).run(scope)

    XCTAssertEqual(outcome503, .retry)
    XCTAssertEqual(outcome429, .retry)
  }

  func testDoesNotRetryA401WhichStaysA401UntilTheAppSetsANewToken() async {
    let recorder = Recorder()
    let outcome = await runner(recorder, result: .httpFailure(httpStatus: 401, retryAfterMinutes: nil)).run(scope)

    XCTAssertEqual(outcome, .failed)
    XCTAssertEqual(recorder.failures.first?.0, DynamicWidgetServerStatus.errorUnauthorized)
    XCTAssertEqual(recorder.failures.first?.1, 401)
  }

  func testDoesNotRetryAnother4xxWhichIsAMisconfiguration() async {
    let recorder = Recorder()
    let outcome = await runner(recorder, result: .httpFailure(httpStatus: 404, retryAfterMinutes: nil)).run(scope)

    XCTAssertEqual(outcome, .failed)
    XCTAssertEqual(recorder.failures.first?.0, DynamicWidgetServerStatus.errorHttp)
  }

  func testDropsAResultBuiltFromSettingsThatHaveSinceChanged() async {
    let recorder = Recorder()
    let outcome = await runner(
      recorder,
      result: .success(body: Data(#"{"total":42}"#.utf8), etag: nil, httpStatus: 200, nextIntervalMinutes: nil),
      revisions: [1, 2]
    ).run(scope)

    XCTAssertEqual(outcome, .dropped)
    XCTAssertTrue(recorder.committed.isEmpty)
    XCTAssertEqual(recorder.successes, 0)
  }

  func testDoesNotFetchForAWidgetWithNoUrlYet() async {
    let recorder = Recorder()
    let outcome = await runner(recorder, settings: settings(url: nil)).run(scope)

    XCTAssertEqual(outcome, .skipped)
    XCTAssertNil(recorder.disabledFor)
  }

  func testReportsDisabledWhenTheAppHasTakenTheWidgetOver() async {
    let recorder = Recorder()
    let outcome = await runner(recorder, settings: settings(enabled: false)).run(scope)

    XCTAssertEqual(outcome, .skipped)
    XCTAssertEqual(recorder.disabledFor, scope)
  }
}
