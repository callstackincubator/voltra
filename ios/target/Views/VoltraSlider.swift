import SwiftUI

public struct VoltraSlider: View {
    private let component: VoltraComponent
    
    @Environment(\.voltraEnvironment)
    private var voltraEnvironment
    
    @State
    private var state: Double

    public init(_ component: VoltraComponent) {
        self.component = component
        let params = component.parameters(SliderParameters.self)
        self.state = params.defaultValue ?? 0
    }

    public var body: some View {
        let params = component.parameters(SliderParameters.self)
#if !os(tvOS)
        Slider(value: $state.onChange({ newState in
            var newComponent = component
            newComponent.state = .double(newState)

            voltraEnvironment.callback(newComponent)
        })) {
            Text("\(component.props?["title"] as? String ?? "")")
        } minimumValueLabel: {
            Text("\(params.minimumLabel ?? "")")
        } maximumValueLabel: {
            Text("\(params.maximumLabel ?? "")")
        }
        .voltraModifiers(component)
#else
        EmptyView()
#endif
    }
}
