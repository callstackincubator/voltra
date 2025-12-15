import Foundation
import SwiftUI
import UIKit

public struct VoltraImage: View {
    private let element: VoltraElement

    public init(_ element: VoltraElement) {
        self.element = element
    }

    /// Creates an Image from the source parameter, falling back to a system photo icon if invalid or not found
    private func createImage(from source: String?) -> Image {
        // Fallback image when source is invalid or not found
        let fallbackImage = Image(systemName: "photo")

        guard let sourceString = source,
              let sourceData = sourceString.data(using: .utf8),
              let sourceDict = try? JSONSerialization.jsonObject(with: sourceData) as? [String: Any] else {
            return fallbackImage
        }

        // Check for base64 first
        if let base64String = sourceDict["base64"] as? String,
           let base64Data = Data(base64Encoded: base64String),
           let uiImage = UIImage(data: base64Data) {
            return Image(uiImage: uiImage)
        }

        // Check for assetName and verify it exists
        if let assetName = sourceDict["assetName"] as? String,
           !assetName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let trimmedName = assetName.trimmingCharacters(in: .whitespacesAndNewlines)

            // Verify asset exists by trying to load it
            if UIImage(named: trimmedName) != nil {
                return Image(trimmedName)
            }
        }

        // Asset not found or invalid, use fallback
        return fallbackImage
    }

    @ViewBuilder
    public var body: some View {
        let params = element.parameters(ImageParameters.self)
        let resizeMode = params.resizeMode.lowercased()
        let baseImage = createImage(from: params.source)
            
        switch resizeMode {
            case "cover":
                // Fill container, may crop
                baseImage
                    .resizable()
                    .scaledToFill()
                    .clipped()
                    .applyStyle(element.style)

            case "contain":
                // Fit within container, may leave space
                baseImage
                    .resizable()
                    .scaledToFit()
                    .applyStyle(element.style)

            case "stretch":
                // Stretch to fill, may distort
                baseImage
                    .resizable()
                    .applyStyle(element.style)

            case "repeat":
                // Tile the image
                baseImage
                    .resizable(resizingMode: .tile)
                    .applyStyle(element.style)

            case "center":
                // Center without scaling
                baseImage
                    .applyStyle(element.style)

            default:
                // Default to cover
                baseImage
                    .resizable()
                    .scaledToFill()
                    .clipped()
                    .applyStyle(element.style)
        }
    }
}
