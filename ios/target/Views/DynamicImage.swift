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

    private var resolvedSource: (kind: String, value: String)? {
        if let kindRaw = params?.imageSourceKind,
           let valueRaw = params?.imageSourceValue {
            let kind = kindRaw.trimmingCharacters(in: .whitespacesAndNewlines)
            let value = valueRaw.trimmingCharacters(in: .whitespacesAndNewlines)
            if !kind.isEmpty, !value.isEmpty {
                return (kind, value)
            }
        }
        // Legacy: check component.props["title"] for system images (backward compat)
        if let systemName = component.props?["title"] as? String, !systemName.isEmpty {
            return ("system", systemName)
        }
        return nil
    }

    private func appGroupIdentifier() -> String? {
        Bundle.main.object(forInfoDictionaryKey: "Voltra_AppGroupIdentifier") as? String
    }

    private func appGroupFileURL(for filename: String) -> URL? {
        guard let identifier = appGroupIdentifier(),
              let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: identifier) else {
            return nil
        }
        return container.appendingPathComponent(filename)
    }

    private func stripAppGroupPrefix(_ raw: String) -> (kind: String, value: String)? {
        let candidates = ["app-group://", "appgroup://"]
        for prefix in candidates {
            if raw.lowercased().hasPrefix(prefix) {
                let trimmed = String(raw.dropFirst(prefix.count))
                return ("app-group", trimmed)
            }
        }
        return nil
    }

    private func imageFromFileURL(_ url: URL) -> Image? {
#if canImport(UIKit)
        if let data = try? Data(contentsOf: url),
           let image = UIImage(data: data) {
            return Image(uiImage: image)
        }
#elseif canImport(AppKit)
        if let image = NSImage(contentsOf: url) {
            return Image(nsImage: image)
        }
#endif
        return nil
    }

    private func loadImage(kind: String, value: String) -> Image? {
        switch kind {
        case "system":
            return Image(systemName: value)
        case "asset":
            return Image(value)
        case "app-group":
            if let url = appGroupFileURL(for: value) {
                return imageFromFileURL(url)
            }
            return nil
        case "uri":
            if let redirected = stripAppGroupPrefix(value) {
                return loadImage(kind: redirected.kind, value: redirected.value)
            }
            if let url = URL(string: value), url.isFileURL {
                return imageFromFileURL(url)
            }
            let fileURL = URL(fileURLWithPath: value)
            return imageFromFileURL(fileURL)
        default:
            return nil
        }
    }

    public var body: some View {
        if let source = resolvedSource,
           let image = loadImage(kind: source.kind, value: source.value) {
            image.voltraModifiers(component)
        } else {
            Image(systemName: "photo")
                .foregroundStyle(Color.gray.opacity(0.35))
                .voltraModifiers(component)
        }
    }
}
