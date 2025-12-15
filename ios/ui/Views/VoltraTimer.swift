import SwiftUI

public struct VoltraTimer: View {
    private let node: VoltraNode
    private let helper = VoltraHelper()

    public init(_ node: VoltraNode) {
        self.node = node
    }

    private func progressRange(params: TimerParameters) -> ClosedRange<Date>? {
        VoltraProgressDriver.resolveRange(
            startAtMs: params.startAtMs,
            endAtMs: params.endAtMs,
            durationMs: params.durationMs
        )
    }
    private func resolvedStartDate(params: TimerParameters) -> Date? { progressRange(params: params)?.lowerBound }
    private func resolvedEndDate(params: TimerParameters) -> Date? { progressRange(params: params)?.upperBound }
    private func countsDown(params: TimerParameters) -> Bool {
        (params.direction.lowercased()) != "up"
    }
    private func textStyle(params: TimerParameters) -> String {
        params.textStyle.lowercased()
    }
    private func autoHideOnEnd(params: TimerParameters) -> Bool {
        params.autoHideOnEnd ?? false
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




    private func countdownTextView(params: TimerParameters, range: ClosedRange<Date>) -> some View {
        let style = textStyle(params: params)
        let templates = textTemplates(params: params)
        return TimelineView(.animation) { context in
            let remaining = range.upperBound.timeIntervalSince(context.date)
            if let text = formattedCountdownText(remaining: remaining, templates: templates, textStyle: style) {
                text
            } else if remaining > 0 {
                if style == "relative" {
                    Text(range.upperBound, style: .relative)
                } else {
                    Text(range.upperBound, style: .timer).monospacedDigit()
                }
            } else {
                if style == "relative" {
                    Text("0s")
                } else {
                    Text("0:00").monospacedDigit()
                }
            }
        }
    }

    private func countUpTextView(params: TimerParameters, range: ClosedRange<Date>) -> some View {
        let style = textStyle(params: params)
        let templates = textTemplates(params: params)
        return TimelineView(.animation) { context in
            let elapsedRaw = context.date.timeIntervalSince(range.lowerBound)
            let total = range.upperBound.timeIntervalSince(range.lowerBound)
            let elapsed = total > 0 ? min(max(0, elapsedRaw), total) : max(0, elapsedRaw)
            if let text = formattedCountUpText(elapsed: elapsed, templates: templates, textStyle: style) {
                text
            } else if style == "relative" {
                Text(range.lowerBound, style: .relative)
            } else {
                Text(range.lowerBound, style: .timer).monospacedDigit()
            }
        }
    }

    private func formattedCountdownText(remaining: TimeInterval, templates: TextTemplates?, textStyle: String) -> Text? {
        guard let templates = templates else { return nil }
        let monospaced = textStyle != "relative"
        if remaining > 0 {
            if let template = templates.running {
                let formatted = countdownTimeString(remaining: remaining, textStyle: textStyle)
                return renderTemplate(template: template, time: formatted, monospaced: monospaced)
            }
        } else {
            if let template = templates.completed {
                let formatted = countdownTimeString(remaining: 0, textStyle: textStyle)
                return renderTemplate(template: template, time: formatted, monospaced: monospaced)
            }
        }
        return nil
    }

    private func formattedCountUpText(elapsed: TimeInterval, templates: TextTemplates?, textStyle: String) -> Text? {
        guard let template = templates?.running else { return nil }
        let formatted = countUpTimeString(elapsed: elapsed, textStyle: textStyle)
        let monospaced = textStyle != "relative"
        return renderTemplate(template: template, time: formatted, monospaced: monospaced)
    }

    private func countdownTimeString(remaining: TimeInterval, textStyle: String) -> String {
        if textStyle == "relative" {
            if remaining <= 0 { return "0s" }
            return Self.relativeFormatter.localizedString(fromTimeInterval: remaining)
        }
        return Self.timerFormatter.string(from: max(remaining, 0)) ?? "0:00"
    }

    private func countUpTimeString(elapsed: TimeInterval, textStyle: String) -> String {
        if textStyle == "relative" {
            return Self.relativeFormatter.localizedString(fromTimeInterval: -elapsed)
        }
        return Self.timerFormatter.string(from: max(elapsed, 0)) ?? "0:00"
    }

    private func renderTemplate(template: String, time: String, monospaced: Bool) -> Text {
        let placeholder = "{time}"
        let segments = template.components(separatedBy: placeholder)
        guard segments.count > 1 else {
            return Text(template)
        }

        var text = Text(verbatim: segments.first ?? "")
        for segment in segments.dropFirst() {
            let timeText = Text(time)
            let formattedTime = monospaced ? timeText.monospacedDigit() : timeText
            text = text + formattedTime
            if !segment.isEmpty {
                text = text + Text(verbatim: segment)
            }
        }

        return text
    }



    @ViewBuilder
    public var body: some View {
        let params = node.parameters(TimerParameters.self)
        if let range = progressRange(params: params) {
            if !autoHideOnEnd(params: params) || resolvedEndDate(params: params).map({ Date() < $0 }) ?? true {
                // Timer component now only supports text mode
                if countsDown(params: params) {
                    countdownTextView(params: params, range: range)
                        .applyStyle(node.style)
                } else {
                    countUpTextView(params: params, range: range)
                        .applyStyle(node.style)
                }
            }
        }
    }
}


// MARK: - Formatters

extension VoltraTimer {
    private static let timerFormatter: DateComponentsFormatter = {
        let formatter = DateComponentsFormatter()
        formatter.allowedUnits = [.minute, .second]
        formatter.zeroFormattingBehavior = [.pad]
        formatter.unitsStyle = .positional
        formatter.maximumUnitCount = 2
        return formatter
    }()

    private static let relativeFormatter: RelativeDateTimeFormatter = {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter
    }()
}
