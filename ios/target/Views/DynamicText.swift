import SwiftUI

public struct DynamicText: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    private let component: VoltraComponent

    init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        let textContent: String = {
            if let children = component.children, case .text(let text) = children {
                return text
            }
            return ""
        }()
        
        Text(.init(textContent))
            .voltraModifiers(component)
    }
}
