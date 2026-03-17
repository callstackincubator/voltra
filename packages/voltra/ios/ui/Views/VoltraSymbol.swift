import SwiftUI

private enum SymbolRenderingMode: String {
  case monochrome
  case hierarchical
  case palette
  case multicolor
}

public struct VoltraSymbol: VoltraView {
  public typealias Parameters = SymbolParameters

  public let element: VoltraElement

  private var params: Parameters {
    element.parameters(Parameters.self)
  }

  public init(_ element: VoltraElement) {
    self.element = element
  }

  private func symbolName(params: SymbolParameters) -> String {
    if let name = params.name, !name.isEmpty {
      return name
    }
    return "questionmark"
  }

  private func symbolTypeKey(params: SymbolParameters) -> String {
    params.type?.lowercased() ?? "monochrome"
  }

  private func renderingMode(params: SymbolParameters) -> SymbolRenderingMode {
    SymbolRenderingMode(rawValue: symbolTypeKey(params: params)) ?? .monochrome
  }

  private func symbolScale(params: SymbolParameters) -> Image.Scale {
    switch params.scale?.lowercased() {
    case "small":
      return .small
    case "large":
      return .large
    case "unspecified":
      return .medium
    case "medium", "default":
      return .medium
    default:
      return .medium
    }
  }

  private func symbolWeight(params: SymbolParameters) -> Font.Weight {
    switch params.weight?.lowercased() {
    case "ultralight":
      return .ultraLight
    case "thin":
      return .thin
    case "light":
      return .light
    case "medium":
      return .medium
    case "semibold":
      return .semibold
    case "bold":
      return .bold
    case "heavy":
      return .heavy
    case "black":
      return .black
    case "regular", "unspecified", nil:
      return .regular
    default:
      return .regular
    }
  }

  private func symbolSize(params: SymbolParameters) -> CGFloat {
    CGFloat(params.size)
  }

  private func tintColor(params: SymbolParameters) -> Color? {
    guard let string = params.tintColor else {
      return nil
    }
    return JSColorParser.parse(string)
  }

  private func paletteColors(params: SymbolParameters) -> [Color] {
    guard let colorsString = params.colors, !colorsString.isEmpty else {
      return []
    }
    return colorsString
      .split(separator: "|")
      .compactMap { part in
        let value = String(part)
        return JSColorParser.parse(value)
      }
  }

  public var body: some View {
    let image = Image(systemName: symbolName(params: params))

    applyStyling(params: params, to: image)
      .applyStyle(element.style)
  }

  @ViewBuilder
  private func applyStyling(params: SymbolParameters, to image: Image) -> some View {
    let sized = image
      .font(.system(size: symbolSize(params: params), weight: symbolWeight(params: params)))
      .imageScale(symbolScale(params: params))

    let colored = applyColor(params: params, to: sized)

    colored
  }

  @ViewBuilder
  private func applyColor(params: SymbolParameters, to view: some View) -> some View {
    let mode = renderingMode(params: params)
    let tint = tintColor(params: params)
    let palette = paletteColors(params: params)
    switch mode {
    case .monochrome:
      if let tint = tint {
        view.foregroundStyle(tint)
      } else {
        view.symbolRenderingMode(.monochrome)
      }
    case .hierarchical:
      if let tint = tint {
        view.symbolRenderingMode(.hierarchical).foregroundStyle(tint)
      } else {
        view.symbolRenderingMode(.hierarchical)
      }
    case .palette:
      if !palette.isEmpty {
        // Swift's variadic foregroundStyle is tricky with array,
        // but .foregroundStyle(Color, Color...) works up to a limit.
        // We'll support up to 3 colors for now as that's common for symbols.
        if palette.count == 1 {
          view.symbolRenderingMode(.palette).foregroundStyle(palette[0])
        } else if palette.count == 2 {
          view.symbolRenderingMode(.palette).foregroundStyle(palette[0], palette[1])
        } else if palette.count >= 3 {
          view.symbolRenderingMode(.palette).foregroundStyle(palette[0], palette[1], palette[2])
        } else {
          view.symbolRenderingMode(.palette)
        }
      } else if let tint = tint {
        view.symbolRenderingMode(.hierarchical).foregroundStyle(tint)
      } else {
        view.symbolRenderingMode(.palette)
      }
    case .multicolor:
      view.symbolRenderingMode(.multicolor)
    }
  }
}
