import Foundation
import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

public struct DynamicImage: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let component: VoltraComponent

    private var params: ImageParameters? {
        component.parameters(ImageParameters.self)
    }

    init(_ component: VoltraComponent) {
        self.component = component
    }

    private var assetName: String? {
        guard let name = params?.assetName, !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return nil
        }
        return name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var resizeMode: String {
        params?.resizeMode?.lowercased() ?? "cover"
    }

    @ViewBuilder
    public var body: some View {
        let baseImage = assetName.map { Image($0) } ?? Image(systemName: "photo")
            
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
