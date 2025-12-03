import SwiftUI

public struct DynamicPicker: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    @State
    private var state: Double

    private let component: VoltraComponent

    private struct PickerParameters: ComponentParameters {
        let defaultValue: Double?
    }

    private var params: PickerParameters? {
        component.parameters(PickerParameters.self)
    }

    init(_ component: VoltraComponent) {
        self.component = component
        let params = component.parameters(PickerParameters.self)
        self.state = params?.defaultValue ?? 0
    }

    public var body: some View {
        Picker(component.props?["title"] as? String ?? "", selection: $state.onChange({ newState in
            var newComponent = component
            newComponent.state = .double(newState)

            voltraEnvironment.callback(newComponent)
        })) {
            if let children = component.children {
                switch children {
                case .component(let component):
                    AnyView(voltraEnvironment.buildView(for: [component]))
                case .components(let components):
                    AnyView(voltraEnvironment.buildView(for: components))
                case .text:
                    // Picker shouldn't have text children, ignore
                    EmptyView()
                }
            }
        }
        .voltraModifiers(component)
    }
}
