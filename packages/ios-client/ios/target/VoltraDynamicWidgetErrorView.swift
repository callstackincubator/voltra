import SwiftUI
import WidgetKit

/// What a Dynamic Widget shows in a dev build when a render fails (ADR 0013 §3): the widget id, the
/// failing stage, the message and the first stack frames, with a retry button where one can be
/// tapped. Plain SwiftUI, not a `VoltraNode`, so it cannot fail the way the content did.
///
/// Never shown in a release build.
struct VoltraDynamicWidgetErrorView: View {
  let widgetId: String
  let failure: DynamicWidgetRenderFailure
  let family: WidgetFamily

  private static let maxStackFrames = 6

  var body: some View {
    let framed = content
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    if #available(iOS 17.0, *) {
      framed.containerBackground(for: .widget) { Color.red.opacity(0.18) }
    } else {
      framed.background(Color.red.opacity(0.18))
    }
  }

  @ViewBuilder
  private var content: some View {
    switch family {
    case .accessoryInline:
      Text("\(widgetId) failed (\(failure.stage.rawValue))")
    case .accessoryCircular:
      VStack(spacing: 1) {
        Image(systemName: "exclamationmark.triangle.fill")
        Text(failure.stage.rawValue).font(.system(size: 9))
      }
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 1) {
        Text("\(widgetId) failed (\(failure.stage.rawValue))").font(.caption.bold())
        Text(failure.message).font(.caption2).lineLimit(3)
      }
    default:
      detailed
    }
  }

  private var isLarge: Bool {
    family == .systemLarge || family == .systemExtraLarge
  }

  private var stackFrames: [String] {
    let limit: Int
    switch family {
    case .systemSmall: limit = 2
    case .systemMedium: limit = 3
    default: limit = Self.maxStackFrames
    }
    let lines = (failure.stack ?? "")
      .split(whereSeparator: \.isNewline)
      .map { $0.trimmingCharacters(in: .whitespaces) }
      .filter { !$0.isEmpty }
    return Array(lines.prefix(limit))
  }

  @ViewBuilder
  private var detailed: some View {
    let body = VStack(alignment: .leading, spacing: 4) {
      Text("Dynamic Widget \"\(widgetId)\" failed (\(failure.stage.rawValue))")
        .font(.system(size: family == .systemSmall ? 11 : 13, weight: .bold))
        .foregroundStyle(.red)
      Text(failure.message)
        .font(.system(size: family == .systemSmall ? 10 : 12))
        .lineLimit(isLarge ? 8 : 3)
      ForEach(stackFrames, id: \.self) { frame in
        Text(frame)
          .font(.system(size: 9, design: .monospaced))
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }
      Spacer(minLength: 0)
      retryLabel
    }
    .padding(8)

    if #available(iOSApplicationExtension 17.0, *) {
      Button(intent: VoltraDynamicWidgetRetryIntent(widgetId: widgetId)) { body }
        .buttonStyle(.plain)
    } else {
      body
    }
  }

  @ViewBuilder
  private var retryLabel: some View {
    if #available(iOSApplicationExtension 17.0, *) {
      Text("Tap to retry").font(.system(size: 11, weight: .semibold))
    } else {
      Text("Reload the widget or restart Metro").font(.system(size: 10))
    }
  }
}
