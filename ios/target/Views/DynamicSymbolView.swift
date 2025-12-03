import SwiftUI
import UIKit

private enum SymbolRenderingMode: String {
    case monochrome
    case hierarchical
    case palette
    case multicolor
}

private struct SymbolRenderConfiguration {
    let name: String
    let renderingMode: SymbolRenderingMode
    let scale: UIImage.SymbolScale
    let weight: UIImage.SymbolWeight
    let pointSize: CGFloat
    let tintColor: UIColor?
    let paletteColors: [UIColor]
    let contentMode: UIView.ContentMode
    let animationSpec: SymbolAnimationSpec?
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
private protocol SymbolEffectAdding {
    func add(to view: UIImageView, options: SymbolEffectOptions)
}

@available(iOS 17.0, *)
private struct BounceEffectAdapter: SymbolEffectAdding {
    private let base: BounceSymbolEffect = .bounce
    let wholeSymbol: Bool?
    let direction: SymbolAnimationDirection?

    func add(to view: UIImageView, options: SymbolEffectOptions) {
        var effect = base
        if wholeSymbol ?? false {
            effect = effect.wholeSymbol
        }
        if let direction {
            effect = direction == .up ? effect.up : effect.down
        }
        view.addSymbolEffect(effect, options: options, animated: true)
    }
}

@available(iOS 17.0, *)
private struct PulseEffectAdapter: SymbolEffectAdding {
    private let base: PulseSymbolEffect = .pulse
    let wholeSymbol: Bool?

    func add(to view: UIImageView, options: SymbolEffectOptions) {
        var effect = base
        if wholeSymbol ?? false {
            effect = effect.wholeSymbol
        }
        view.addSymbolEffect(effect, options: options, animated: true)
    }
}

@available(iOS 17.0, *)
private struct ScaleEffectAdapter: SymbolEffectAdding {
    private let base: ScaleSymbolEffect = .scale
    let wholeSymbol: Bool?
    let direction: SymbolAnimationDirection?

    func add(to view: UIImageView, options: SymbolEffectOptions) {
        var effect = base
        if wholeSymbol ?? false {
            effect = effect.wholeSymbol
        }
        if let direction {
            effect = direction == .up ? effect.up : effect.down
        }
        view.addSymbolEffect(effect, options: options, animated: true)
    }
}

@available(iOS 17.0, *)
private extension SymbolAnimationSpec.VariableSpec {
    func toVariableEffect() -> VariableColorSymbolEffect {
        var effect: VariableColorSymbolEffect = .variableColor
        if cumulative ?? false {
            effect = effect.cumulative
        }
        if iterative ?? false {
            effect = effect.iterative
        }
        if hideInactiveLayers ?? false {
            effect = effect.hideInactiveLayers
        }
        if dimInactiveLayers ?? false {
            effect = effect.dimInactiveLayers
        }
        if reversing ?? false {
            effect = effect.reversing
        }
        if nonReversing ?? false {
            effect = effect.nonReversing
        }
        return effect
    }
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

private final class SymbolRenderView: UIView {
    private let imageView = UIImageView()
    private var configuration: SymbolRenderConfiguration?

    override init(frame: CGRect) {
        super.init(frame: frame)
        clipsToBounds = false
        imageView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(imageView)
        NSLayoutConstraint.activate([
            imageView.leadingAnchor.constraint(equalTo: leadingAnchor),
            imageView.trailingAnchor.constraint(equalTo: trailingAnchor),
            imageView.topAnchor.constraint(equalTo: topAnchor),
            imageView.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override var intrinsicContentSize: CGSize {
        if let pointSize = configuration?.pointSize {
            return CGSize(width: pointSize, height: pointSize)
        }
        return super.intrinsicContentSize
    }

    func apply(configuration: SymbolRenderConfiguration) {
        self.configuration = configuration
        invalidateIntrinsicContentSize()
        reloadSymbol()
    }

    private func reloadSymbol() {
        guard let config = configuration else {
            imageView.image = nil
            return
        }
        guard let baseImage = UIImage(systemName: config.name) else {
            imageView.image = nil
            return
        }

        imageView.contentMode = config.contentMode

        var symbolConfig = UIImage.SymbolConfiguration(
            pointSize: config.pointSize,
            weight: config.weight,
            scale: config.scale
        )

        switch config.renderingMode {
        case .monochrome:
            if #available(iOS 16.0, *) {
                symbolConfig = symbolConfig.applying(UIImage.SymbolConfiguration.preferringMonochrome())
            }
        case .hierarchical:
            if let tint = config.tintColor {
                symbolConfig = symbolConfig.applying(UIImage.SymbolConfiguration(hierarchicalColor: tint))
            }
        case .palette:
            if config.paletteColors.count > 1 {
                symbolConfig = symbolConfig.applying(UIImage.SymbolConfiguration(paletteColors: config.paletteColors))
            } else if let tint = config.tintColor {
                symbolConfig = symbolConfig.applying(UIImage.SymbolConfiguration(hierarchicalColor: tint))
            }
        case .multicolor:
            if #available(iOS 16.0, *) {
                symbolConfig = symbolConfig.applying(UIImage.SymbolConfiguration.preferringMulticolor())
            }
        }

        imageView.preferredSymbolConfiguration = symbolConfig

        var finalImage = baseImage
        if let tint = config.tintColor,
           config.renderingMode != .hierarchical,
           config.renderingMode != .palette {
            finalImage = baseImage.withTintColor(tint, renderingMode: .alwaysOriginal)
        }

        imageView.image = finalImage
        if let tint = config.tintColor {
            imageView.tintColor = tint
        }

        if #available(iOS 17.0, *) {
            imageView.removeAllSymbolEffects()
            if let spec = config.animationSpec {
                applyAnimation(spec)
            }
        }
    }

    @available(iOS 17.0, *)
    private func applyAnimation(_ spec: SymbolAnimationSpec) {
        let options = spec.makeOptions()
        if let variable = spec.variableAnimationSpec {
            imageView.addSymbolEffect(variable.toVariableEffect(), options: options, animated: true)
            return
        }
        guard let effect = spec.effect else { return }

        switch effect.type {
        case .bounce:
            BounceEffectAdapter(wholeSymbol: effect.wholeSymbol, direction: effect.direction)
                .add(to: imageView, options: options)
        case .pulse:
            PulseEffectAdapter(wholeSymbol: effect.wholeSymbol)
                .add(to: imageView, options: options)
        case .scale:
            ScaleEffectAdapter(wholeSymbol: effect.wholeSymbol, direction: effect.direction)
                .add(to: imageView, options: options)
        }
    }
}

private struct SymbolUIViewRepresentable: UIViewRepresentable {
    var configuration: SymbolRenderConfiguration

    func makeUIView(context: Context) -> SymbolRenderView {
        SymbolRenderView()
    }

    func updateUIView(_ uiView: SymbolRenderView, context: Context) {
        uiView.apply(configuration: configuration)
    }
}

/// Voltra: SymbolView
///
/// Dynamic rendering for SF Symbols with Expo Symbols API parity.
public struct DynamicSymbolView: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let component: VoltraComponent
    private let colorHelper = VoltraHelper()

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

    private var symbolScale: UIImage.SymbolScale {
        switch params?.scale?.lowercased() {
        case "small":
            return .small
        case "large":
            return .large
        case "unspecified":
            return .unspecified
        case "medium", "default":
            return .medium
        default:
            return .medium
        }
    }

    private var symbolWeight: UIImage.SymbolWeight {
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

    private var tintUIColor: UIColor? {
        guard let string = params?.tintColor,
              let color = colorHelper.translateColor(string) else {
            return nil
        }
        return UIColor(color)
    }

    private var paletteColors: [UIColor] {
        guard let colorsString = params?.colors, !colorsString.isEmpty else {
            return []
        }
        return colorsString
            .split(separator: "|")
            .compactMap { part in
                let value = String(part)
                return colorHelper.translateColor(value).map { UIColor($0) }
            }
    }

    private var contentMode: UIView.ContentMode {
        switch params?.resizeMode?.lowercased() {
        case "scaletofill":
            return .scaleToFill
        case "scaleaspectfill":
            return .scaleAspectFill
        case "center":
            return .center
        case "top":
            return .top
        case "bottom":
            return .bottom
        case "left":
            return .left
        case "right":
            return .right
        case "topleft":
            return .topLeft
        case "topright":
            return .topRight
        case "bottomleft":
            return .bottomLeft
        case "bottomright":
            return .bottomRight
        default:
            return .scaleAspectFit
        }
    }

    private var animationSpec: SymbolAnimationSpec? {
        guard let raw = params?.animationSpec,
              let data = raw.data(using: .utf8) else {
            return nil
        }
        return try? JSONDecoder().decode(SymbolAnimationSpec.self, from: data)
    }

    private var symbolConfiguration: SymbolRenderConfiguration {
        SymbolRenderConfiguration(
            name: symbolName,
            renderingMode: renderingMode,
            scale: symbolScale,
            weight: symbolWeight,
            pointSize: symbolSize,
            tintColor: tintUIColor,
            paletteColors: paletteColors,
            contentMode: contentMode,
            animationSpec: animationSpec
        )
    }

    public var body: some View {
        SymbolUIViewRepresentable(configuration: symbolConfiguration)
            .voltraModifiers(component)
    }
}
