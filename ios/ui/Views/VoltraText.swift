import SwiftUI

public struct VoltraText: View {
    private let component: VoltraComponent

    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        let params = component.parameters(TextParameters.self)
        let textContent: String = {
            if let children = component.children, case .text(let text) = children {
                return text
            }
            return ""
        }()

        Text(.init(textContent))
            .ifLet(params.multilineTextAlignment) { view, alignment in
                let textAlignment: TextAlignment
                switch alignment.lowercased() {
                case "center": textAlignment = .center
                case "right": textAlignment = .trailing
                default: textAlignment = .leading
                }
                return view.multilineTextAlignment(textAlignment)
            }
            .ifLet(params.numberOfLines) { view, numberOfLines in
                view.lineLimit(Int(numberOfLines))
            }
            .voltraModifiers(component)
    }
}
