//
//  Date+toTimerInterval.swift
//  
//
//  Created by Artur Bilski on 04/08/2025.
//
import SwiftUI

extension Date {
  static func toTimerInterval(miliseconds: Double) -> ClosedRange<Self> {
      Self.now...max(Self.now, Date(timeIntervalSince1970: miliseconds / 1000))
  }

  static func toTimerInterval(startAtMs: Double?, endAtMs: Double) -> ClosedRange<Self> {
      let end = Date(timeIntervalSince1970: endAtMs / 1000)
      let start: Date
      if let s = startAtMs {
          start = Date(timeIntervalSince1970: s / 1000)
      } else {
          start = .now
      }
      // Ensure start <= end to avoid invalid range
      if start > end {
          return end...end
      }
      // If end is in the past, clamp to now to avoid negative intervals
      return start...max(.now, end)
  }
}
