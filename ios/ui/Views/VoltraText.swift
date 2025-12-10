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

        // Check if text alignment is specified in styles
        let hasTextAlignment = component.style?["textAlign"] != nil

        let textView = Text(.init(textContent))
            .voltraModifiers(component)
            .fixedSize(horizontal: !hasTextAlignment, vertical: true)

        // Apply lineLimit if numberOfLines is specified
        if let numberOfLines = params.numberOfLines {
            textView.lineLimit(Int(numberOfLines))
        } else {
            textView
        }
    }
}
