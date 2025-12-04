//
//  VoltraComponent+Parameters.swift
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

extension VoltraComponent {
    /// Generic type-safe parameter accessor
    /// - Parameter type: The parameter struct type to decode
    /// - Returns: Decoded parameters, or nil if decoding fails or no parameters exist
    public func parameters<T: ComponentParameters>(_ type: T.Type) -> T? {
        guard let raw = parametersRaw else { return nil }
        do {
            // Convert AnyCodable dictionary to Data
            let dict = raw.mapValues { $0.toAny() }
            let data = try JSONSerialization.data(withJSONObject: dict, options: [])
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            return nil
        }
    }

    /// Convenience accessor for Label parameters
    public var labelParameters: LabelParameters? {
        guard type == "Label" else { return nil }
        return parameters(LabelParameters.self)
    }

    /// Convenience accessor for Image parameters
    public var imageParameters: ImageParameters? {
        guard type == "Image" else { return nil }
        return parameters(ImageParameters.self)
    }

    /// Convenience accessor for SymbolView parameters
    public var symbolViewParameters: SymbolViewParameters? {
        guard type == "SymbolView" else { return nil }
        return parameters(SymbolViewParameters.self)
    }

    /// Convenience accessor for Toggle parameters
    public var toggleParameters: ToggleParameters? {
        guard type == "Toggle" else { return nil }
        return parameters(ToggleParameters.self)
    }

    /// Convenience accessor for Slider parameters
    public var sliderParameters: SliderParameters? {
        guard type == "Slider" else { return nil }
        return parameters(SliderParameters.self)
    }

    /// Convenience accessor for ProgressView parameters
    public var progressViewParameters: ProgressViewParameters? {
        guard type == "ProgressView" else { return nil }
        return parameters(ProgressViewParameters.self)
    }

    /// Convenience accessor for Gauge parameters
    public var gaugeParameters: GaugeParameters? {
        guard type == "Gauge" else { return nil }
        return parameters(GaugeParameters.self)
    }

    /// Convenience accessor for Timer parameters
    public var timerParameters: TimerParameters? {
        guard type == "Timer" else { return nil }
        return parameters(TimerParameters.self)
    }

    /// Convenience accessor for LinearGradient parameters
    public var linearGradientParameters: LinearGradientParameters? {
        guard type == "LinearGradient" else { return nil }
        return parameters(LinearGradientParameters.self)
    }

    /// Convenience accessor for VStack parameters
    public var vStackParameters: VStackParameters? {
        guard type == "VStack" else { return nil }
        return parameters(VStackParameters.self)
    }

    /// Convenience accessor for HStack parameters
    public var hStackParameters: HStackParameters? {
        guard type == "HStack" else { return nil }
        return parameters(HStackParameters.self)
    }

    /// Convenience accessor for ZStack parameters
    public var zStackParameters: ZStackParameters? {
        guard type == "ZStack" else { return nil }
        return parameters(ZStackParameters.self)
    }

    /// Convenience accessor for ScrollView parameters
    public var scrollViewParameters: ScrollViewParameters? {
        guard type == "ScrollView" else { return nil }
        return parameters(ScrollViewParameters.self)
    }

    /// Convenience accessor for DisclosureGroup parameters
    public var disclosureGroupParameters: DisclosureGroupParameters? {
        guard type == "DisclosureGroup" else { return nil }
        return parameters(DisclosureGroupParameters.self)
    }

    /// Convenience accessor for GlassContainer parameters
    public var glassContainerParameters: GlassContainerParameters? {
        guard type == "GlassContainer" else { return nil }
        return parameters(GlassContainerParameters.self)
    }

    /// Convenience accessor for GlassView parameters
    public var glassViewParameters: GlassViewParameters? {
        guard type == "GlassView" else { return nil }
        return parameters(GlassViewParameters.self)
    }

    /// Convenience accessor for Spacer parameters
    public var spacerParameters: SpacerParameters? {
        guard type == "Spacer" else { return nil }
        return parameters(SpacerParameters.self)
    }
}
