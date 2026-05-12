import SwiftUI

extension Date {
  static func toTimerInterval(milliseconds: Double) -> ClosedRange<Self> {
    now ... max(now, Date(timeIntervalSince1970: milliseconds / 1000))
  }

  static func toTimerInterval(startAtMs: Double?, endAtMs: Double) -> ClosedRange<Self> {
    let end = Date(timeIntervalSince1970: endAtMs / 1000)
    let start: Date
    if let s = startAtMs {
      start = Date(timeIntervalSince1970: s / 1000)
    } else {
      start = .now
    }
    // Handle countdown case: if start > end, swap them for countdown behavior
    if start > end {
      // For countdown, range should be end...start (swapped)
      // Clamp to now if end is in the past
      return end ... max(.now, start)
    }
    // If end is in the past, clamp to now to avoid negative intervals
    return start ... max(.now, end)
  }
}
