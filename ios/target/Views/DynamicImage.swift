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

    public var body: some View {
        if let name = assetName {
            Image(name)
                .voltraModifiers(component)
        } else {
            Image(systemName: "photo")
                .foregroundStyle(Color.gray.opacity(0.35))
                .voltraModifiers(component)
        }
    }
}
