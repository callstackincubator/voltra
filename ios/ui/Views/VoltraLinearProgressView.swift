import SwiftUI

public struct VoltraLinearProgressView: View {
    private let component: VoltraComponent
    private let helper = VoltraHelper()
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    @ViewBuilder
    public var body: some View {
        let params = component.parameters(LinearProgressViewParameters.self)
        let endAtMs = params.endAtMs
        let startAtMs = params.startAtMs
        
        // Extract colors and styling from direct props
        let trackColor = params.trackColor.flatMap { helper.translateColor($0) }
        let progressColor = params.progressColor.flatMap { helper.translateColor($0) }
        let cornerRadius = params.cornerRadius.map { CGFloat($0) }
        let height = params.height.map { CGFloat($0) }
        
        // Get thumb component prop
        let thumbComponent = component.componentProp("thumb")
        
        // Determine if we need custom style
        let needsCustomStyle = trackColor != nil || cornerRadius != nil || height != nil || thumbComponent != nil
        
        // Define the custom style builder (if needed)
        let customStyle = VoltraLinearProgressStyle(
            progressTint: progressColor,
            trackTint: trackColor ?? Color.gray.opacity(0.2),
            cornerRadius: cornerRadius,
            explicitHeight: height,
            thumbComponent: thumbComponent
        )
        
        // Group containing the ProgressView variations
        let progressContent = Group {
            if let endAtMs = endAtMs {
                // Timer-based progress
                let timeRange = Date.toTimerInterval(startAtMs: startAtMs, endAtMs: endAtMs)
                
                ProgressView(timerInterval: timeRange)
                    .tint(progressColor)
            } else if let value = params.value {
                // Determinate progress
                ProgressView(
                    value: value,
                    total: params.maximumValue ?? 100
                )
                .tint(progressColor)
            } else {
                // Indeterminate progress
                ProgressView()
                    .tint(progressColor)
            }
        }
        
        // Apply the style conditionally
        if needsCustomStyle {
            progressContent
                .progressViewStyle(customStyle)
                .applyStyle(component.style)
        } else {
            progressContent
                .progressViewStyle(LinearProgressViewStyle())
                .applyStyle(component.style)
        }
    }
}

@available(iOS 16.0, macOS 13.0, *)
private struct VoltraLinearProgressStyle: ProgressViewStyle {
    var progressTint: Color?
    var trackTint: Color
    var cornerRadius: CGFloat?
    var explicitHeight: CGFloat?
    var thumbComponent: VoltraChildren?

    func makeBody(configuration: Configuration) -> some View {
        let fraction = max(0, min(configuration.fractionCompleted ?? 0, 1))
        
        VoltraLinearProgressBar(
            fraction: fraction,
            progressTint: progressTint,
            trackTint: trackTint,
            cornerRadius: cornerRadius,
            explicitHeight: explicitHeight,
            thumbComponent: thumbComponent
        )
    }
}

/// Shared progress bar view used by VoltraLinearProgressStyle
@available(iOS 16.0, macOS 13.0, *)
private struct VoltraLinearProgressBar: View {
    let fraction: Double
    var progressTint: Color?
    var trackTint: Color
    var cornerRadius: CGFloat?
    var explicitHeight: CGFloat?
    var thumbComponent: VoltraChildren?
    
    var body: some View {
        let baseHeight = explicitHeight ?? 4

        GeometryReader { geometry in
            let totalWidth = geometry.size.width
            let radius = cornerRadius ?? baseHeight / 2
            
            // Progress bar
            ZStack(alignment: .leading) {
                // Track (background)
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(trackTint)
                    .frame(width: totalWidth, height: baseHeight)
                
                // Progress fill
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(progressTint ?? Color.accentColor)
                    .frame(width: totalWidth * CGFloat(fraction), height: baseHeight)
            }
            .overlay(alignment: .leading) {
                // Render thumb component at progress position
                if let thumbComponent = thumbComponent {
                    let offsetX = (totalWidth * CGFloat(fraction))
                    VoltraChildrenRenderer(children: thumbComponent)
                        .offset(x: offsetX)
                }
            }
            .frame(width: totalWidth, height: baseHeight)
        }
    }
}

