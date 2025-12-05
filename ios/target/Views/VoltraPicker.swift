import SwiftUI

public struct VoltraPicker: View {
    private let component: VoltraComponent
    
    @Environment(\.voltraEnvironment)
    private var voltraEnvironment
    
    @State
    private var state: Double

    public init(_ component: VoltraComponent) {
        self.component = component
        // Note: PickerParameters is empty, so defaultValue comes from component.state or defaults to 0
        self.state = 0
    }

    public var body: some View {
        Picker(component.props?["title"] as? String ?? "", selection: $state.onChange({ newState in
            var newComponent = component
            newComponent.state = .double(newState)

            voltraEnvironment.callback(newComponent)
        })) {
            VoltraChildrenView(component: component)
        }
        .voltraModifiers(component)
    }
}
