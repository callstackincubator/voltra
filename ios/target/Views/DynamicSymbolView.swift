import SwiftUI

private enum SymbolRenderingMode: String {
    case monochrome
    case hierarchical
    case palette
    case multicolor
}

private enum SymbolAnimationType: String, Decodable {
    case bounce
    case pulse
    case scale
}

private enum SymbolAnimationDirection: String, Decodable {
    case up
    case down
}

private struct SymbolAnimationSpec: Decodable {
    struct Effect: Decodable {
        let type: SymbolAnimationType
        let wholeSymbol: Bool?
        let direction: SymbolAnimationDirection?
    }

    struct VariableSpec: Decodable {
        let reversing: Bool?
        let nonReversing: Bool?
        let cumulative: Bool?
        let iterative: Bool?
        let hideInactiveLayers: Bool?
        let dimInactiveLayers: Bool?
    }

    let effect: Effect?
    let repeating: Bool?
    let repeatCount: Int?
    let speed: Double?
    let variableAnimationSpec: VariableSpec?
}

@available(iOS 17.0, *)
private extension SymbolAnimationSpec {
    func makeOptions() -> SymbolEffectOptions {
        var options: SymbolEffectOptions = (repeating ?? false) ? .repeating : .nonRepeating
        if let repeatCount {
            options = options.repeat(abs(repeatCount))
        }
        if let speed {
            options = options.speed(speed)
        }
        return options
    }
}

@available(iOS 17.0, *)
private func applyVariableEffect<V: View>(to view: V, spec: SymbolAnimationSpec.VariableSpec, options: SymbolEffectOptions) -> some View {
    // Build effect by checking flags in priority order
    // Since modifiers can't be chained conditionally due to type changes,
    // we apply them in a specific order based on priority
    let base: VariableColorSymbolEffect = .variableColor
    
    if spec.cumulative == true {
        return view.symbolEffect(base.cumulative, options: options, isActive: true)
    }
    if spec.iterative == true {
        return view.symbolEffect(base.iterative, options: options, isActive: true)
    }
    if spec.hideInactiveLayers == true {
        return view.symbolEffect(base.hideInactiveLayers, options: options, isActive: true)
    }
    if spec.dimInactiveLayers == true {
        return view.symbolEffect(base.dimInactiveLayers, options: options, isActive: true)
    }
    if spec.reversing == true {
        return view.symbolEffect(base.reversing, options: options, isActive: true)
    }
    if spec.nonReversing == true {
        return view.symbolEffect(base.nonReversing, options: options, isActive: true)
    }
    
    return view.symbolEffect(base, options: options, isActive: true)
}

/// Voltra: SymbolView
///
/// Dynamic rendering for SF Symbols with Expo Symbols API parity.
public struct DynamicSymbolView: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let component: VoltraComponent
    private let colorHelper = VoltraHelper()
    
    // Trigger for discrete animations
    @State private var animationTrigger = false

    private var params: SymbolViewParameters? {
        component.parameters(SymbolViewParameters.self)
    }

    init(_ component: VoltraComponent) {
        self.component = component
    }

    private var symbolName: String {
        if let name = params?.name, !name.isEmpty {
            return name
        }
        return "questionmark"
    }

    private var symbolTypeKey: String {
        params?.type?.lowercased() ?? "monochrome"
    }

    private var renderingMode: SymbolRenderingMode {
        SymbolRenderingMode(rawValue: symbolTypeKey) ?? .monochrome
    }

    private var symbolScale: Image.Scale {
        switch params?.scale?.lowercased() {
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

    private var symbolWeight: Font.Weight {
        switch params?.weight?.lowercased() {
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

    private var symbolSize: CGFloat {
        if let size = params?.size {
            return CGFloat(size)
        }
        return 24.0
    }

    private var tintColor: Color? {
        guard let string = params?.tintColor else {
            return nil
        }
        return colorHelper.translateColor(string)
    }

    private var paletteColors: [Color] {
        guard let colorsString = params?.colors, !colorsString.isEmpty else {
            return []
        }
        return colorsString
            .split(separator: "|")
            .compactMap { part in
                let value = String(part)
                return colorHelper.translateColor(value)
        }
    }

    private var animationSpec: SymbolAnimationSpec? {
        guard let raw = params?.animationSpec,
              let data = raw.data(using: .utf8) else {
            return nil
        }
        return try? JSONDecoder().decode(SymbolAnimationSpec.self, from: data)
    }

    public var body: some View {
        let image = Image(systemName: symbolName)
        
        applyStyling(to: image)
            .voltraModifiers(component)
            .onAppear {
                animationTrigger = true
            }
    }

    @ViewBuilder
    private func applyStyling(to image: Image) -> some View {
        let sized = image
            .font(.system(size: symbolSize, weight: symbolWeight))
            .imageScale(symbolScale)

        let colored = applyColor(to: sized)
        
        if #available(iOS 17.0, *), let spec = animationSpec {
            applyAnimation(to: colored, spec: spec)
        } else {
            colored
        }
    }

    @ViewBuilder
    private func applyColor(to view: some View) -> some View {
        switch renderingMode {
        case .monochrome:
            if let tint = tintColor {
                view.foregroundStyle(tint)
            } else {
                view.symbolRenderingMode(.monochrome)
            }
        case .hierarchical:
            if let tint = tintColor {
                view.symbolRenderingMode(.hierarchical).foregroundStyle(tint)
            } else {
                view.symbolRenderingMode(.hierarchical)
            }
        case .palette:
            if !paletteColors.isEmpty {
                // Swift's variadic foregroundStyle is tricky with array, 
                // but .foregroundStyle(Color, Color...) works up to a limit.
                // We'll support up to 3 colors for now as that's common for symbols.
                if paletteColors.count == 1 {
                    view.symbolRenderingMode(.palette).foregroundStyle(paletteColors[0])
                } else if paletteColors.count == 2 {
                    view.symbolRenderingMode(.palette).foregroundStyle(paletteColors[0], paletteColors[1])
                } else if paletteColors.count >= 3 {
                    view.symbolRenderingMode(.palette).foregroundStyle(paletteColors[0], paletteColors[1], paletteColors[2])
                } else {
                     view.symbolRenderingMode(.palette)
                }
            } else if let tint = tintColor {
                 view.symbolRenderingMode(.hierarchical).foregroundStyle(tint)
            } else {
                 view.symbolRenderingMode(.palette)
            }
        case .multicolor:
            view.symbolRenderingMode(.multicolor)
        }
    }

    @available(iOS 17.0, *)
    @ViewBuilder
    private func applyAnimation(to view: some View, spec: SymbolAnimationSpec) -> some View {
        let options = spec.makeOptions()
        
        if let variable = spec.variableAnimationSpec {
            applyVariableEffect(to: view, spec: variable, options: options)
        } else if let effectSpec = spec.effect {
            switch effectSpec.type {
            case .bounce:
                let effect = BounceSymbolEffect.bounce
                
                if effectSpec.direction == .up {
                    view.symbolEffect(effect.up, options: options, value: animationTrigger)
                } else if effectSpec.direction == .down {
                    view.symbolEffect(effect.down, options: options, value: animationTrigger)
                } else {
                    view.symbolEffect(effect, options: options, value: animationTrigger)
                }
                
            case .pulse:
                let effect = PulseSymbolEffect.pulse
                if effectSpec.wholeSymbol == true {
                    view.symbolEffect(effect.wholeSymbol, options: options, isActive: true)
                } else {
                    view.symbolEffect(effect, options: options, isActive: true)
                }
                
            case .scale:
                let effect = ScaleSymbolEffect.scale
                if effectSpec.direction == .up {
                    view.symbolEffect(effect.up, options: options, isActive: true)
                } else if effectSpec.direction == .down {
                    view.symbolEffect(effect.down, options: options, isActive: true)
                } else {
                    view.symbolEffect(effect, options: options, isActive: true)
                }
            }
        } else {
            view
        }
    }
}
