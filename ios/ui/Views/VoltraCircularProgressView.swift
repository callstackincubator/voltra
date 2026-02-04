import SwiftUI

public struct VoltraCircularProgressView: VoltraView {
  public typealias Parameters = CircularProgressViewParameters

  public let element: VoltraElement

  public init(_ element: VoltraElement) {
    self.element = element
  }

  @ViewBuilder
  public var body: some View {
    let p = params
    let progressColor = p.progressColor.flatMap { JSColorParser.parse($0) }
    let trackColor = p.trackColor.flatMap { JSColorParser.parse($0) }
    let lineWidth = p.lineWidth.map { CGFloat($0) }

    // Circular variant does not support timer-based progress ring via built-in ProgressView on iOS.
    // We remove the timer option as it would only display an indeterminate spinner.
    let isDeterminate = p.value != nil
    
    // Custom style provides the "ring" appearance for determinate progress.
    let hasCustomProps = trackColor != nil || lineWidth != nil
    let useCustomStyle = hasCustomProps && isDeterminate

    if let value = p.value {
      // Determinate progress
      ProgressView(value: value, total: p.maximumValue) {
        element.componentProp("label")
      } currentValueLabel: {
        element.componentProp("currentValueLabel")
      }
      .tint(progressColor)
      .voltraIf(useCustomStyle) {
        $0.progressViewStyle(VoltraCircularProgressStyle(
          progressTint: progressColor,
          trackTint: trackColor ?? Color.gray.opacity(0.2),
          lineWidth: lineWidth,
          staticFraction: nil 
        ))
      }
      .voltraIf(!useCustomStyle) {
        // Fallback to custom style for determinate even if no custom props,
        // because built-in .circular is a spinner, not a ring.
        $0.progressViewStyle(VoltraCircularProgressStyle(
          progressTint: progressColor,
          trackTint: Color.gray.opacity(0.2),
          lineWidth: 4,
          staticFraction: nil
        ))
      }
      .applyStyle(element.style)
    } else {
      // Indeterminate progress (Built-in spinner)
      // Wrapping in VStack to ensure stable geometry for the animation
      VStack(spacing: 0) {
        ProgressView {
          element.componentProp("label")
        }
        .progressViewStyle(.circular)
        .tint(progressColor)
      }
      .applyStyle(element.style)
    }
  }
}

@available(iOS 16.0, macOS 13.0, *)
private struct VoltraCircularProgressStyle: ProgressViewStyle {
  var progressTint: Color?
  var trackTint: Color
  var lineWidth: CGFloat?
  var staticFraction: Double?

  func makeBody(configuration: Configuration) -> some View {
    let fraction = max(0, min(staticFraction ?? configuration.fractionCompleted ?? 0, 1))
    let strokeWidth = lineWidth ?? 4

    VStack(spacing: 8) {
      configuration.label

      ZStack {
        // Track
        Circle()
          .stroke(trackTint, lineWidth: strokeWidth)

        // Progress arc
        Circle()
          .trim(from: 0, to: fraction)
          .stroke(
            progressTint ?? Color.accentColor,
            style: StrokeStyle(lineWidth: strokeWidth, lineCap: .round)
          )
          .rotationEffect(.degrees(-90))
          .animation(.linear, value: fraction)
      }
      .aspectRatio(1, contentMode: .fit)

      configuration.currentValueLabel
    }
  }
}
