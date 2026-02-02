import SwiftUI

public struct VoltraTimer: VoltraView {
  public typealias Parameters = TimerParameters

  public let element: VoltraElement

  public init(_ element: VoltraElement) {
    self.element = element
  }

  private func progressRange(params: TimerParameters) -> ClosedRange<Date>? {
    // Stopwatch support: if counting up (not down) and we have a start time
    // but no end time or duration, treat it as an open-ended stopwatch.
    if !countsDown(params: params),
       let startAtMs = params.startAtMs,
       params.endAtMs == nil,
       params.durationMs == nil
    {
      let start = Date(timeIntervalSince1970: startAtMs / 1000)
      return start ... Date.distantFuture
    }

    return VoltraProgressDriver.resolveRange(
      startAtMs: params.startAtMs,
      endAtMs: params.endAtMs,
      durationMs: params.durationMs
    )
  }

  private func resolvedEndDate(params: TimerParameters) -> Date? { progressRange(params: params)?.upperBound }

  private func countsDown(params: TimerParameters) -> Bool {
    (params.direction.lowercased()) != "up"
  }

  private func textStyle(params: TimerParameters) -> String {
    params.textStyle.lowercased()
  }

  private struct TextTemplates: Codable {
    let running: String?
    let completed: String?
  }

  private func textTemplates(params: TimerParameters) -> TextTemplates? {
    guard let raw = params.textTemplates,
          let data = raw.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(TextTemplates.self, from: data)
  }

  @ViewBuilder
  public var body: some View {
    if let range = progressRange(params: params) {
      timerView(params: params, range: range)
        .applyStyle(element.style)
    }
  }

  @ViewBuilder
  private func timerView(params: TimerParameters, range: ClosedRange<Date>) -> some View {
    let isFinished = Date() >= range.upperBound
    let templates = textTemplates(params: params)
    let style = textStyle(params: params)
    let showHours = params.showHours

    if isFinished, let completedTemplate = templates?.completed {
      renderTemplate(template: completedTemplate) {
        staticZeroText(style: style, showHours: showHours)
      }
    } else {
      if let runningTemplate = templates?.running {
        renderTemplate(template: runningTemplate) {
          activeTimerText(params: params, range: range)
        }
      } else {
        activeTimerText(params: params, range: range)
      }
    }
  }

  @ViewBuilder
  private func activeTimerText(params: TimerParameters, range: ClosedRange<Date>) -> some View {
    let style = textStyle(params: params)
    let isCountDown = countsDown(params: params)
    let showHours = params.showHours

    if style == "relative" {
      let targetDate = isCountDown ? range.upperBound : range.lowerBound
      Text(targetDate, style: .relative)
    } else {
      // Live Activities require Text(timerInterval:...) for automatic updates
      Text(timerInterval: range, countsDown: isCountDown, showsHours: showHours)
        .monospacedDigit()
    }
  }

  @ViewBuilder
  private func staticZeroText(style: String, showHours: Bool) -> some View {
    if style == "relative" {
      Text("0s")
    } else {
      Text(showHours ? "0:00:00" : "0:00")
        .monospacedDigit()
    }
  }

  @ViewBuilder
  private func renderTemplate<T: View>(template: String, @ViewBuilder timeView: @escaping () -> T) -> some View {
    let placeholder = "{time}"
    let segments = template.components(separatedBy: placeholder)

    if segments.count > 1 {
      HStack(spacing: 0) {
        ForEach(Array(segments.enumerated()), id: \.offset) { index, segment in
          Text(verbatim: segment)
          if index < segments.count - 1 {
            timeView()
          }
        }
      }
    } else {
      Text(template)
    }
  }
}

// MARK: - Formatters

extension VoltraTimer {
  // Formatters are no longer needed for live updates but kept if we need static fallbacks.
}
