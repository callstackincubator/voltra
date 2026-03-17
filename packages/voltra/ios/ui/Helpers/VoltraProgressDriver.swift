//
//  VoltraProgressDriver.swift
//  Voltra
//
//  Centralised helpers for time-driven progress behaviour shared by Timer,
//  ProgressView, and Gauge implementations.
//

import Foundation

enum VoltraProgressDriver {
  /// Resolve a time range from the common millisecond-based parameters.
  ///
  /// - Parameters:
  ///   - startAtMs: Epoch milliseconds when the animation should begin. Optional.
  ///   - endAtMs: Epoch milliseconds when the animation should end. Optional but preferred.
  ///   - durationMs: Duration in milliseconds. Used when `endAtMs` is omitted.
  /// - Returns: A closed `Date` range representing the timeline, or `nil` if insufficient data was supplied.
  static func resolveRange(startAtMs: Double?, endAtMs: Double?, durationMs: Double?) -> ClosedRange<Date>? {
    if let endAtMs = endAtMs {
      return Date.toTimerInterval(startAtMs: startAtMs, endAtMs: endAtMs)
    }

    if let durationMs = durationMs {
      let now = Date()
      let durationSeconds = max(0, durationMs / 1000)
      let startDate: Date
      if let startAtMs = startAtMs {
        startDate = Date(timeIntervalSince1970: startAtMs / 1000)
      } else {
        startDate = now
      }
      let endDate = startDate.addingTimeInterval(durationSeconds)
      let clampedEnd = max(endDate, now)
      return startDate ... clampedEnd
    }

    return nil
  }

  /// Compute progress (0...1) for the supplied range at `date`.
  ///
  /// The progress value is clamped to `[0, 1]` unless `clamp` is `false`.
  static func progress(for range: ClosedRange<Date>, at date: Date = Date(), clamp: Bool = true) -> Double {
    let total = range.upperBound.timeIntervalSince(range.lowerBound)
    if total <= 0 { return clamp ? 1 : 0 }
    let elapsed = date.timeIntervalSince(range.lowerBound)
    let ratio = elapsed / total
    if !clamp { return ratio }
    return min(max(ratio, 0), 1)
  }
}
