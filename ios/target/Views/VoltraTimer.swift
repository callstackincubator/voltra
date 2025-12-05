//
//  VoltraTimer.swift
//  Voltra
//
//  Flexible countdown/stopwatch view backed by SwiftUI system timer renderers.
//

import SwiftUI

public struct VoltraTimer: View {
    private let component: VoltraComponent
    private let helper = VoltraHelper()

    public init(_ component: VoltraComponent) {
        self.component = component
    }

    // Helpers to read parameters
    private func endAtMs(params: TimerParameters) -> Double? { params.endAtMs }
    private func startAtMs(params: TimerParameters) -> Double? { params.startAtMs }
    private func durationMs(params: TimerParameters) -> Double? { params.durationMs }
    private func progressRange(params: TimerParameters) -> ClosedRange<Date>? {
        VoltraProgressDriver.resolveRange(
            startAtMs: startAtMs(params: params),
            endAtMs: endAtMs(params: params),
            durationMs: durationMs(params: params)
        )
    }
    private func resolvedStartDate(params: TimerParameters) -> Date? { progressRange(params: params)?.lowerBound }
    private func resolvedEndDate(params: TimerParameters) -> Date? { progressRange(params: params)?.upperBound }
    private func mode(params: TimerParameters) -> String {
        params.mode?.lowercased() ?? "text"
    }
    private func direction(params: TimerParameters) -> String {
        params.direction?.lowercased() ?? "down"
    }
    private func countsDown(params: TimerParameters) -> Bool { direction(params: params) != "up" }
    private func textStyle(params: TimerParameters) -> String {
        params.textStyle?.lowercased() ?? "timer"
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

    private func modeOrderedModifiers(params: TimerParameters) -> [String: [VoltraModifier]] {
        guard let raw = params.modeOrderedModifiers,
              let data = raw.data(using: .utf8) else { return [:] }

        do {
            let decoded = try JSONDecoder().decode([String: [VoltraModifier]].self, from: data)
            var lowered: [String: [VoltraModifier]] = [:]
            for (key, value) in decoded {
                lowered[key.lowercased()] = value
            }
            return lowered
        } catch {
            return [:]
        }
    }

    private func modeTrackColors(params: TimerParameters) -> [String: Color] {
        guard let raw = params.modeTrackColors,
              let data = raw.data(using: .utf8),
              let decoded = try? JSONDecoder().decode([String: String].self, from: data) else { return [:] }

        var lowered: [String: Color] = [:]
        for (key, value) in decoded {
            if let color = helper.translateColor(value) {
                lowered[key.lowercased()] = color
            }
        }
        return lowered
    }

    private func modeTintColors(params: TimerParameters) -> [String: Color] {
        guard let raw = params.modeTintColors,
              let data = raw.data(using: .utf8),
              let decoded = try? JSONDecoder().decode([String: String].self, from: data) else { return [:] }

        var lowered: [String: Color] = [:]
        for (key, value) in decoded {
            if let color = helper.translateColor(value) {
                lowered[key.lowercased()] = color
            }
        }
        return lowered
    }

    private func mergedModifiers(params: TimerParameters, for variantKey: String?) -> [VoltraModifier] {
        var result: [VoltraModifier] = []
        if let baseModifiers = component.modifiers {
            result.append(contentsOf: baseModifiers)
        }
        let modifiers = modeOrderedModifiers(params: params)
        if let defaults = modifiers["default"] {
            result.append(contentsOf: defaults)
        }
        if let key = variantKey?.lowercased(), key != "default", let extras = modifiers[key] {
            result.append(contentsOf: extras)
        }
        return result
    }

    private func resolvedCornerRadius(params: TimerParameters, for variantKey: String?) -> CGFloat? {
        for modifier in mergedModifiers(params: params, for: variantKey).reversed() {
            if modifier.name == "cornerRadius" {
                if let radius = modifier.args?["radius"]?.toDouble() {
                    return CGFloat(radius)
                }
                if let radiusInt = modifier.args?["radius"]?.toInt() {
                    return CGFloat(radiusInt)
                }
            }
        }
        return nil
    }

    private func resolvedFrameHeight(params: TimerParameters, for variantKey: String?) -> CGFloat? {
        for modifier in mergedModifiers(params: params, for: variantKey).reversed() {
            if modifier.name == "frame" {
                if let height = modifier.args?["height"]?.toDouble() {
                    return CGFloat(height)
                }
                if let heightInt = modifier.args?["height"]?.toInt() {
                    return CGFloat(heightInt)
                }
            }
        }
        return nil
    }

    private func resolvedTintColor(params: TimerParameters, for variantKey: String?) -> Color? {
        for modifier in mergedModifiers(params: params, for: variantKey).reversed() {
            if modifier.name == "tint", let colorName = modifier.args?["color"]?.toString(), let color = helper.translateColor(colorName) {
                return color
            }
        }

        return nil
    }

    private func finalTintColor(params: TimerParameters, for variantKey: String?) -> Color? {
        let tintColors = modeTintColors(params: params)
        if let key = variantKey?.lowercased(), let color = tintColors[key] {
            return color
        }
        if let color = tintColors["default"] {
            return color
        }
        if let color = resolvedTintColor(params: params, for: variantKey) {
            return color
        }
        return resolvedTintColor(params: params, for: nil)
    }

    private func countdownTextView(params: TimerParameters, range: ClosedRange<Date>) -> some View {
        let style = textStyle(params: params)
        let templates = textTemplates(params: params)
        return TimelineView(.animation) { context in
            let remaining = range.upperBound.timeIntervalSince(context.date)
            if let text = formattedCountdownText(remaining: remaining, templates: templates, textStyle: style) {
                return AnyView(text)
            } else if remaining > 0 {
                if style == "relative" {
                    return AnyView(Text(range.upperBound, style: .relative))
                } else {
                    return AnyView(Text(range.upperBound, style: .timer).monospacedDigit())
                }
            } else {
                if style == "relative" {
                    return AnyView(Text("0s"))
                } else {
                    return AnyView(Text("0:00").monospacedDigit())
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
                return AnyView(text)
            } else if style == "relative" {
                return AnyView(Text(range.lowerBound, style: .relative))
            } else {
                return AnyView(Text(range.lowerBound, style: .timer).monospacedDigit())
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

    private func trackColor(params: TimerParameters, for variantKey: String?) -> Color? {
        let trackColors = modeTrackColors(params: params)
        if let key = variantKey?.lowercased(), let color = trackColors[key] {
            return color
        }
        return trackColors["default"]
    }

    private func applyModifiers<Content: View>(params: TimerParameters, _ content: Content, variantKey: String?) -> AnyView {
        var view = AnyView(content.voltraModifiers(component))

        let modifiers = modeOrderedModifiers(params: params)
        if let defaults = modifiers["default"], !defaults.isEmpty {
            view = AnyView(view.voltraModifiers(defaults))
        }

        if let key = variantKey?.lowercased(), let extras = modifiers[key], !extras.isEmpty {
            view = AnyView(view.voltraModifiers(extras))
        }

        return view
    }

    public var body: some View {
        let params = component.parameters(TimerParameters.self)
#if !os(tvOS)
        if #available(iOS 16.0, macOS 13.0, *) {
            guard let range = progressRange(params: params) else {
                return AnyView(EmptyView())
            }

            if autoHideOnEnd(params: params), let end = resolvedEndDate(params: params), Date() >= end {
                return AnyView(EmptyView())
            }

            switch mode(params: params) {
            case "circular":
                let variantKey = "circular"
                let progressView = ProgressView(timerInterval: range)
                    .progressViewStyle(.circular)
                var modified = applyModifiers(params: params, progressView, variantKey: variantKey)
                if let tint = finalTintColor(params: params, for: variantKey) {
                    modified = AnyView(modified.tint(tint))
                }
                return modified
            case "bar":
                let variantKey = "bar"
                let trackTint = trackColor(params: params, for: variantKey)
                let progressTint = finalTintColor(params: params, for: variantKey)
                let height = resolvedFrameHeight(params: params, for: variantKey) ?? resolvedFrameHeight(params: params, for: nil)
                let radius = resolvedCornerRadius(params: params, for: variantKey) ?? resolvedCornerRadius(params: params, for: nil)

                let progress: AnyView
                if let trackTint = trackTint {
                    let style = VoltraLinearTimerStyle(
                        progressTint: progressTint,
                        trackTint: trackTint,
                        cornerRadius: radius,
                        explicitHeight: height
                    )
                    progress = AnyView(
                        ProgressView(timerInterval: range)
                            .progressViewStyle(style)
                    )
                } else {
                    progress = AnyView(
                        ProgressView(timerInterval: range)
                            .progressViewStyle(.linear)
                    )
                }
                var modified = applyModifiers(params: params, progress, variantKey: variantKey)
                if let tint = finalTintColor(params: params, for: variantKey) {
                    modified = AnyView(modified.tint(tint))
                }
                return modified
            default:
                if countsDown(params: params) {
                    let textView = countdownTextView(params: params, range: range)
                    return applyModifiers(params: params, textView, variantKey: "text")
                } else {
                    let textView = countUpTextView(params: params, range: range)
                    return applyModifiers(params: params, textView, variantKey: "text")
                }
            }
        } else {
            return AnyView(EmptyView())
        }
#else
        return AnyView(EmptyView())
#endif
    }
}

@available(iOS 16.0, macOS 13.0, *)
private struct VoltraLinearTimerStyle: ProgressViewStyle {
    var progressTint: Color?
    var trackTint: Color
    var cornerRadius: CGFloat?
    var explicitHeight: CGFloat?

    func makeBody(configuration: Configuration) -> some View {
        GeometryReader { geometry in
            let fraction = max(0, min(configuration.fractionCompleted ?? 0, 1))
            let totalWidth = geometry.size.width
            let height = explicitHeight ?? max(geometry.size.height, 4)
            let radius = cornerRadius ?? height / 2
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(trackTint)
                    .frame(width: totalWidth, height: height)
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(progressTint ?? Color.accentColor)
                    .frame(width: totalWidth * CGFloat(fraction), height: height)
            }
        }
        .frame(height: explicitHeight ?? 4)
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
