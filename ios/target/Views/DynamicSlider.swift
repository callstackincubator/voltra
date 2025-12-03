import SwiftUI

public struct DynamicSlider: View {
    @Environment(\.internalVoltraEnvironment)
    private var voltraEnvironment

    @State
    private var state: Double

    private let component: VoltraComponent

    // Type-safe parameter access
    private var params: SliderParameters? {
        component.parameters(SliderParameters.self)
    }

    init(_ component: VoltraComponent) {
        let params = component.parameters(SliderParameters.self)
        self.state = params?.defaultValue ?? 0
        self.component = component
    }

    public var body: some View {
#if !os(tvOS)
        Slider(value: $state.onChange({ newState in
            var newComponent = component
            newComponent.state = .double(newState)

            voltraEnvironment.callback(newComponent)
        })) {
            Text("\(component.props?["title"] as? String ?? "")")
        } minimumValueLabel: {
            Text("\(params?.minimumLabel ?? "")")
        } maximumValueLabel: {
            Text("\(params?.maximumLabel ?? "")")
        }
        .voltraModifiers(component)
#else
        EmptyView()
#endif
    }
}
