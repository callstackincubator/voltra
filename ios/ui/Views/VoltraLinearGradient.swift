import SwiftUI

public struct VoltraLinearGradient: VoltraView {
    public typealias Parameters = LinearGradientParameters

    public let element: VoltraElement

    public init(_ element: VoltraElement) {
        self.element = element
    }

    // Map string to UnitPoint
    private func parsePoint(_ s: String?) -> UnitPoint {
        guard let raw = s else { return .center }
        
        // Handle custom coordinates in "x,y" format
        if raw.contains(",") {
            let components = raw.split(separator: ",")
            if components.count == 2,
               let x = Double(components[0]),
               let y = Double(components[1]) {
                return UnitPoint(x: x, y: y)
            }
        }
        
        // Handle predefined string values
        switch raw.lowercased() {
        case "top": return .top
        case "bottom": return .bottom
        case "leading": return .leading
        case "trailing": return .trailing
        case "topleading": return .topLeading
        case "toptrailing": return .topTrailing
        case "bottomleading": return .bottomLeading
        case "bottomtrailing": return .bottomTrailing
        case "center": fallthrough
        default: return .center
        }
    }

    // Build Gradient from parameters
    private func buildGradient(params: LinearGradientParameters) -> Gradient {
        // Prefer explicit stops over color array
        if let stopsStr = params.stops {
            let parts = stopsStr.split(separator: "|")
            var stops: [Gradient.Stop] = []
            for part in parts {
                let sub = part.split(separator: "@", maxSplits: 1).map(String.init)
                if sub.count == 2 {
                    let colorStr = sub[0]
                    let locStr = sub[1]
                    if let color = JSColorParser.parse(colorStr) {
                        let loc = Double(locStr) ?? 0.0
                        stops.append(.init(color: color, location: loc))
                    }
                }
            }
            if !stops.isEmpty { return Gradient(stops: stops) }
        }
        if let colorsStr = params.colors {
            let parts = colorsStr.split(separator: "|").map(String.init)
            let colors: [Color] = parts.compactMap { JSColorParser.parse($0) }
            if !colors.isEmpty { return Gradient(colors: colors) }
        }
        // Fallback neutral gradient
        return Gradient(colors: [Color.black.opacity(0.25), Color.black.opacity(0.05)])
    }

    public var body: some View {
        let gradient = buildGradient(params: params)
        let start = parsePoint(params.startPoint)
        let end = parsePoint(params.endPoint)

        // Note: dither parameter is available in node.parameters["dither"] but SwiftUI's LinearGradient
        // doesn't expose dithering control directly. This is handled automatically by the system.
        let lg = LinearGradient(gradient: gradient, startPoint: start, endPoint: end)

        // Use ZStack with a Rectangle that fills and is tinted by the gradient, then overlay children.
        return ZStack {
            Rectangle().fill(lg)
            element.children ?? .empty
        }
        .applyStyle(element.style)
    }
}
