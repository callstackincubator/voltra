import SwiftUI

public struct VoltraText: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
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
