import SwiftUI

public struct VoltraGauge: View {
 private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    
    public var body: some View {
        let params = component.parameters(GaugeParameters.self)
        let label = component.componentProp("label")
        let currentValueLabel = component.componentProp("currentValueLabel")
        let minimumValueLabel = component.componentProp("minimumValueLabel")
        let maximumValueLabel = component.componentProp("maximumValueLabel")
        let value = params.value ?? 0.0
        let range = (params.minimumValue ?? 0.0)...(params.maximumValue ?? 1.0)
        let gaugeStyle = params.gaugeStyle
        let tintColor = params.tintColor
         
        let gauge = Gauge(value: value, in: range) {
                buildNestedView(label)
              } currentValueLabel: {
                buildNestedView(currentValueLabel)
              } minimumValueLabel: {
                buildNestedView(minimumValueLabel)
              } maximumValueLabel: {
                buildNestedView(maximumValueLabel)
              }
        
        applyTint(applyGaugeStyle(gauge, gaugeStyle), tintColor)
    }

    @ViewBuilder
    private func applyGaugeStyle(_ gauge: some View, _ gaugeStyle: String?) -> some View {
        switch gaugeStyle {
        case "automatic":
            gauge.gaugeStyle(.automatic)
        case "accessoryCircular":
            gauge.gaugeStyle(.accessoryCircular)
        case "accessoryCircularCapacity":
            gauge.gaugeStyle(.accessoryCircularCapacity)
        case "accessoryLinear":
            gauge.gaugeStyle(.accessoryLinear)
        case "accessoryLinearCapacity", "linearCapacity":
            gauge.gaugeStyle(.accessoryLinearCapacity)
        default:
            gauge
        }
    }
    
    @ViewBuilder
    private func applyTint(_ view: some View, _ optionalColor: String?) -> some View {
        if let color = optionalColor {
            view.tint(JSColorParser.parse(color))
        } else {
            view
        }
    }
    
    @ViewBuilder
    private func buildNestedView(_ optionalNestedView: VoltraChildren?) -> some View {
        if let nestedView = optionalNestedView {
            VoltraChildrenRenderer(children: nestedView)
        } else {
            EmptyView()
        }
    }
}
