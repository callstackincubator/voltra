import SwiftUI

public struct VoltraLinearProgressView: VoltraView {
  public typealias Parameters = LinearProgressViewParameters

  public let element: VoltraElement

  @State private var internalStartTime = Date()

  public init(_ element: VoltraElement) {
    self.element = element
  }

  @ViewBuilder
  public var body: some View {
    let p = params
    let progressColor = p.progressColor.flatMap { JSColorParser.parse($0) }
    let trackColor = p.trackColor.flatMap { JSColorParser.parse($0) }
    let cornerRadius = p.cornerRadius.map { CGFloat($0) }
    let height = p.height.map { CGFloat($0) }
    let thumbComponent = element.componentProp("thumb")

    let isTimer = p.endAtMs != nil
    
    // Linear progress bar only supports Determinate and Timer modes.
    // If no value or timer is provided, we fall back to a 0% determinate state
    // as linear indeterminate progress is not supported.
    let isDeterminate = p.value != nil
    let effectiveValue = p.value ?? 0.0

    // Built-in style is required for timers to animate in realtime (Live Activities).
    let hasCustomProps = trackColor != nil || cornerRadius != nil || height != nil || thumbComponent != .empty
    let useCustomStyle = hasCustomProps && isDeterminate

    if isTimer, let endAtMs = p.endAtMs {
      // Timer-based progress (Always uses built-in style for realtime updates)
      ProgressView(
        timerInterval: Date.toTimerInterval(
          startAtMs: p.startAtMs ?? (internalStartTime.timeIntervalSince1970 * 1000),
          endAtMs: endAtMs
        ),
        countsDown: p.countDown ?? false
      ) {
        element.componentProp("label")
      } currentValueLabel: {
        element.componentProp("currentValueLabel")
      }
      .progressViewStyle(.linear)
      .tint(progressColor)
      .applyStyle(element.style)
    } else {
      // Determinate progress (Default fallback if no value/timer)
      ProgressView(value: effectiveValue, total: p.maximumValue) {
        element.componentProp("label")
      } currentValueLabel: {
        element.componentProp("currentValueLabel")
      }
      .tint(progressColor)
      .voltraIf(useCustomStyle) {
        $0.progressViewStyle(VoltraLinearProgressStyle(
          progressTint: progressColor,
          trackTint: trackColor ?? Color.gray.opacity(0.2),
          cornerRadius: cornerRadius,
          explicitHeight: height,
          thumbComponent: thumbComponent != .empty ? thumbComponent : nil
        ))
      }
      .voltraIf(!useCustomStyle) {
        $0.progressViewStyle(.linear)
      }
      .applyStyle(element.style)
    }
  }
}

@available(iOS 16.0, macOS 13.0, *)
private struct VoltraLinearProgressStyle: ProgressViewStyle {
  var progressTint: Color?
  var trackTint: Color
  var cornerRadius: CGFloat?
  var explicitHeight: CGFloat?
  var thumbComponent: VoltraNode?

  func makeBody(configuration: Configuration) -> some View {
    let fraction = max(0, min(configuration.fractionCompleted ?? 0, 1))
    let baseHeight = explicitHeight ?? 4

    VStack(alignment: .leading, spacing: 4) {
      configuration.label

      GeometryReader { geometry in
        let totalWidth = geometry.size.width
        let radius = cornerRadius ?? baseHeight / 2

        ZStack(alignment: .leading) {
          // Track
          RoundedRectangle(cornerRadius: radius, style: .continuous)
            .fill(trackTint)
            .frame(width: totalWidth, height: baseHeight)

          // Progress fill
          RoundedRectangle(cornerRadius: radius, style: .continuous)
            .fill(progressTint ?? Color.accentColor)
            .frame(width: totalWidth * CGFloat(fraction), height: baseHeight)
        }
        .overlay(alignment: .leading) {
          if let thumbComponent = thumbComponent {
            thumbComponent
              .offset(x: totalWidth * CGFloat(fraction))
          }
        }
      }
      .frame(height: baseHeight)

      configuration.currentValueLabel
    }
  }
}
