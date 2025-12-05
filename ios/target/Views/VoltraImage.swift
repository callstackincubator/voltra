import Foundation
import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

public struct VoltraImage: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    @ViewBuilder
    public var body: some View {
        let params = component.parameters(ImageParameters.self)
        let resizeMode = params.resizeMode?.lowercased() ?? "cover"
        
        // Parse source object
        let baseImage: Image = {
            guard let sourceString = params.source,
                  let sourceData = sourceString.data(using: .utf8),
                  let sourceDict = try? JSONSerialization.jsonObject(with: sourceData) as? [String: Any] else {
                return Image(systemName: "photo")
            }
            
            // Check for base64 first
            if let base64String = sourceDict["base64"] as? String,
               let base64Data = Data(base64Encoded: base64String) {
                #if canImport(UIKit)
                if let uiImage = UIImage(data: base64Data) {
                    return Image(uiImage: uiImage)
                }
                #elseif canImport(AppKit)
                if let nsImage = NSImage(data: base64Data) {
                    return Image(nsImage: nsImage)
                }
                #endif
            }
            
            // Check for assetName
            if let assetName = sourceDict["assetName"] as? String,
               !assetName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return Image(assetName.trimmingCharacters(in: .whitespacesAndNewlines))
            }
            
            return Image(systemName: "photo")
        }()
            
        switch resizeMode {
            case "cover":
                // Fill container, may crop
                baseImage
                    .resizable()
                    .scaledToFill()
                    .clipped()
                    .voltraModifiers(component)
                    
            case "contain":
                // Fit within container, may leave space
                baseImage
                    .resizable()
                    .scaledToFit()
                    .voltraModifiers(component)
                    
            case "stretch":
                // Stretch to fill, may distort
                baseImage
                    .resizable()
                    .voltraModifiers(component)
                    
            case "repeat":
                // Tile the image
                baseImage
                    .resizable(resizingMode: .tile)
                    .voltraModifiers(component)
                    
            case "center":
                // Center without scaling
                baseImage
                    .voltraModifiers(component)
                    
            default:
                // Default to cover
                baseImage
                    .resizable()
                    .scaledToFill()
                    .clipped()
                    .voltraModifiers(component)
        }
    }
}
