import SwiftUI

public struct VoltraGauge: VoltraView {
    public typealias Parameters = GaugeParameters

    public let element: VoltraElement

    public init(_ element: VoltraElement) {
        self.element = element
    }

    public var body: some View {
        let label = element.componentProp("label")
        let currentValueLabel = element.componentProp("currentValueLabel")
        let minimumValueLabel = element.componentProp("minimumValueLabel")
        let maximumValueLabel = element.componentProp("maximumValueLabel")
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
    private func buildNestedView(_ nestedView: VoltraNode) -> some View {
        nestedView
    }
}
