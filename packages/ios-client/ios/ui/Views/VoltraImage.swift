import Foundation
import SwiftUI
import UIKit
#if canImport(WidgetKit)
  import WidgetKit
#endif

public struct VoltraImage: VoltraView {
  public typealias Parameters = ImageParameters

  public let element: VoltraElement

  @Environment(\.voltraEnvironment) private var voltraEnvironment

  public init(_ element: VoltraElement) {
    self.element = element
  }

  /// Applies `.widgetAccentedRenderingMode(...)` on iOS 18+ when the widget is in an
  /// accented or vibrant rendering mode and the consumer has opted in via the
  /// `accentedRenderingMode` prop. Outside of accented/vibrant mode this is a no-op.
  ///
  /// `widgetAccentedRenderingMode` is declared on `Image` (not `View`) in WidgetKit, so
  /// this helper must take an `Image` and be called before any modifier that erases the
  /// `Image` type (e.g. `.scaledToFit()`, `.clipped()`).
  @ViewBuilder
  private func applyAccentedRenderingMode(_ image: Image) -> some View {
    #if canImport(WidgetKit)
      if #available(iOSApplicationExtension 18.0, iOS 18.0, *),
         let mode = params.accentedRenderingMode,
         let widget = voltraEnvironment.widget,
         widget.renderingMode == .accented || widget.renderingMode == .vibrant
      {
        switch mode {
        case "fullColor":
          image.widgetAccentedRenderingMode(.fullColor)
        case "accented":
          image.widgetAccentedRenderingMode(.accented)
        case "accentedDesaturated":
          image.widgetAccentedRenderingMode(.accentedDesaturated)
        case "desaturated":
          image.widgetAccentedRenderingMode(.desaturated)
        default:
          image
        }
      } else {
        image
      }
    #else
      image
    #endif
  }

  /// Creates an Image from the source parameter, returning nil if invalid or not found
  private func createImage(from source: String?) -> Image? {
    guard let sourceString = source,
          let sourceData = sourceString.data(using: .utf8),
          let sourceDict = try? JSONSerialization.jsonObject(with: sourceData) as? [String: Any]
    else {
      return nil
    }

    // Check for base64 first
    if let base64String = sourceDict["base64"] as? String,
       let base64Data = Data(base64Encoded: base64String),
       let uiImage = UIImage(data: base64Data)
    {
      return Image(uiImage: uiImage)
    }

    // Check for assetName - first try preloaded images from App Group, then asset catalog
    if let assetName = sourceDict["assetName"] as? String,
       !assetName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    {
      let trimmedName = assetName.trimmingCharacters(in: .whitespacesAndNewlines)

      // First, check for preloaded image in App Group storage
      if let preloadedImage = VoltraImageStore.loadImage(key: trimmedName) {
        return Image(uiImage: preloadedImage)
      }

      // Fall back to asset catalog
      if let catalogImage = UIImage(named: trimmedName) {
        return Image(uiImage: catalogImage)
      }
    }

    // Asset not found or invalid
    return nil
  }

  @ViewBuilder
  public var body: some View {
    let resizeMode = params.resizeMode.lowercased()
    if let baseImage = createImage(from: params.source) {
      switch resizeMode {
      case "cover":
        // Fill container, may crop
        applyAccentedRenderingMode(baseImage.resizable())
          .scaledToFill()
          .clipped()
          .applyStyle(element.style)

      case "contain":
        // Fit within container, may leave space
        applyAccentedRenderingMode(baseImage.resizable())
          .scaledToFit()
          .applyStyle(element.style)

      case "stretch":
        // Stretch to fill, may distort
        applyAccentedRenderingMode(baseImage.resizable())
          .applyStyle(element.style)

      case "repeat":
        // Tile the image
        applyAccentedRenderingMode(baseImage.resizable(resizingMode: .tile))
          .applyStyle(element.style)

      case "center":
        // Center without scaling
        applyAccentedRenderingMode(baseImage)
          .applyStyle(element.style)

      default:
        // Default to cover
        applyAccentedRenderingMode(baseImage.resizable())
          .scaledToFill()
          .clipped()
          .applyStyle(element.style)
      }
    } else {
      let fallbackNode = element.componentProp("fallback")
      if !fallbackNode.isEmpty {
        Color.clear
          .overlay(fallbackNode)
          .applyStyle(element.style)
      } else {
        Color.clear
          .applyStyle(element.style)
      }
    }
  }
}
