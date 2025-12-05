import SwiftUI

public struct VoltraScrollView: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        let params = component.parameters(ScrollViewParameters.self)
        let axes: Axis.Set = {
            switch params.axis?.lowercased() {
            case "horizontal": return .horizontal
            case "vertical": return .vertical
            case "both": return [.horizontal, .vertical]
            default: return .vertical
            }
        }()

        ScrollView(axes, showsIndicators: params.showsIndicators ?? true) {
            VoltraChildrenView(component: component)
        }
        .voltraModifiers(component)
    }
}
