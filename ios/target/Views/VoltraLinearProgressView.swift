import SwiftUI
import UIKit

/// Thumb image data with optional dimensions
private struct ThumbImageData {
    let image: Image
    let width: CGFloat?
    let height: CGFloat?
}

public struct VoltraLinearProgressView: View {
    private let component: VoltraComponent
    private let helper = VoltraHelper()
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }
    
    /// Creates a ThumbImageData from the thumbImage source parameter (expects JSON string)
    private func createThumbImage(fromJSON jsonString: String?) -> ThumbImageData? {
        guard let sourceString = jsonString else {
            return nil
        }
        
        guard let sourceData = sourceString.data(using: .utf8) else {
            return nil
        }
        
        guard let sourceDict = try? JSONSerialization.jsonObject(with: sourceData) as? [String: Any] else {
            return nil
        }
        
        return createThumbImageFromDict(sourceDict)
    }
    
    /// Creates a ThumbImageData from a dictionary source
    private func createThumbImageFromDict(_ sourceDict: [String: Any]) -> ThumbImageData? {
        var image: Image?
        
        // Check for symbolName first (SF Symbol)
        if let symbolName = sourceDict["symbolName"] as? String {
            let trimmedName = symbolName.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmedName.isEmpty {
                image = Image(systemName: trimmedName)
            }
        }
        // Check for base64
        else if let base64String = sourceDict["base64"] as? String,
           let base64Data = Data(base64Encoded: base64String),
           let uiImage = UIImage(data: base64Data) {
            image = Image(uiImage: uiImage)
        }
        // Check for assetName and verify it exists
        else if let assetName = sourceDict["assetName"] as? String {
            let trimmedName = assetName.trimmingCharacters(in: .whitespacesAndNewlines)
            
            // Verify asset exists by trying to load it
            if UIImage(named: trimmedName) != nil {
                image = Image(trimmedName)
            }
        }
        
        guard let image = image else {
            return nil
        }
        
        // Extract width and height if present (always cast to Double)
        let width = (sourceDict["width"] as? NSNumber).map { CGFloat($0.doubleValue) }
        let height = (sourceDict["height"] as? NSNumber).map { CGFloat($0.doubleValue) }
        
        return ThumbImageData(image: image, width: width, height: height)
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
        
        // Decode thumbImage from JSON string in parameters
        let thumbImageData = createThumbImage(fromJSON: params.thumbImage)
        
        // Determine if we need custom style
        let needsCustomStyle = trackColor != nil || cornerRadius != nil || height != nil || thumbImageData != nil
        
        // Define the custom style builder (if needed)
        let customStyle = VoltraLinearProgressStyle(
            progressTint: progressColor,
            trackTint: trackColor ?? Color.gray.opacity(0.2),
            cornerRadius: cornerRadius,
            explicitHeight: height,
            thumbImageData: thumbImageData
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
                .voltraModifiers(component)
        } else {
            progressContent
                .progressViewStyle(LinearProgressViewStyle())
                .voltraModifiers(component)
        }
    }
}

@available(iOS 16.0, macOS 13.0, *)
private struct VoltraLinearProgressStyle: ProgressViewStyle {
    var progressTint: Color?
    var trackTint: Color
    var cornerRadius: CGFloat?
    var explicitHeight: CGFloat?
    var thumbImageData: ThumbImageData?

    func makeBody(configuration: Configuration) -> some View {
        let fraction = max(0, min(configuration.fractionCompleted ?? 0, 1))
        
        VoltraLinearProgressBar(
            fraction: fraction,
            progressTint: progressTint,
            trackTint: trackTint,
            cornerRadius: cornerRadius,
            explicitHeight: explicitHeight,
            thumbImageData: thumbImageData
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
    var thumbImageData: ThumbImageData?
    
    var body: some View {
        let baseHeight = explicitHeight ?? 4

        GeometryReader { geometry in
            // Calculate thumb size: use explicit width/height if provided, otherwise default to baseHeight * 1.5
            let thumbWidth = thumbImageData?.width ?? (thumbImageData?.height ?? baseHeight * 1.5)
            let thumbHeight = thumbImageData?.height ?? thumbWidth

            // Calculate total frame height: ensure it's tall enough for the thumb if present
            let totalHeight = thumbImageData != nil ? max(baseHeight, thumbHeight) : baseHeight
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
                // Thumb at progress position
                if let thumbData = thumbImageData {
                    let offsetX = (totalWidth * CGFloat(fraction)) - (thumbWidth / 2)
                    thumbData.image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: thumbWidth, height: thumbHeight)
                        .offset(x: offsetX)
                }
            }
            .frame(width: totalWidth, height: totalHeight)
        }
    }
}

