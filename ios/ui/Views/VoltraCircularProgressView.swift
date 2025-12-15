import SwiftUI

public struct VoltraCircularProgressView: View {
    private let element: VoltraElement

    public init(_ element: VoltraElement) {
        self.element = element
    }

    @ViewBuilder
    public var body: some View {
        let params = element.parameters(CircularProgressViewParameters.self)
        let endAtMs = params.endAtMs
        let startAtMs = params.startAtMs
        
        // Extract colors and styling from direct props
        let trackColor = params.trackColor.flatMap { JSColorParser.parse($0) }
        let progressColor = params.progressColor.flatMap { JSColorParser.parse($0) }
        let lineWidth = params.lineWidth.map { CGFloat($0) }

        // Determine if we need custom style
        let needsCustomStyle = trackColor != nil || lineWidth != nil || params.value != nil

        // Group containing the ProgressView variations
        let progressContent = Group {
            if let endAtMs = endAtMs {
                // Timer-based progress
                let timeRange = Date.toTimerInterval(startAtMs: startAtMs, endAtMs: endAtMs)
                
                ProgressView(timerInterval: timeRange)
            } else if let value = params.value {
                // Determinate progress
                ProgressView(
                    value: value,
                    total: params.maximumValue ?? 100
                )
            } else {
                // Indeterminate progress (only supported for circular)
                ProgressView()
            }
        }
        
        // Apply the style conditionally
        if needsCustomStyle {
            let customStyle = VoltraCircularProgressStyle(
                progressTint: progressColor,
                trackTint: trackColor ?? Color.gray.opacity(0.2),
                lineWidth: lineWidth
            )

            progressContent
                .progressViewStyle(customStyle)
                .applyStyle(element.style)
        } else {
            progressContent
                .progressViewStyle(.circular)
                .tint(progressColor)
                .applyStyle(element.style)
        }
    }
}

@available(iOS 16.0, macOS 13.0, *)
private struct VoltraCircularProgressStyle: ProgressViewStyle {
    var progressTint: Color?
    var trackTint: Color
    var lineWidth: CGFloat?

    func makeBody(configuration: Configuration) -> some View {
        let fraction = max(0, min(configuration.fractionCompleted ?? 0, 1))
        let strokeWidth = lineWidth ?? 4
        
        return GeometryReader { geometry in
            let size = min(geometry.size.width, geometry.size.height)
            
            ZStack {
                // Track (background circle)
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
            .frame(width: size, height: size)
        }
    }
}

