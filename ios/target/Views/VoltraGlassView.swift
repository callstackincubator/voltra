import SwiftUI

/// Voltra: GlassView (iOS 26+ preferred, but renders content on lower OSes)
///
/// Renders its children and applies ordered modifiers (including `glassEffect`) to the wrapper.
public struct VoltraGlassView: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        // Render a clear surface that receives the glassEffect/shape modifiers,
        // then overlay children so content remains visible above the glass.
        Group {
            Color.clear
        }
        .voltraModifiers(component)
        .overlay {
            VoltraChildrenView(component: component)
        }
    }
}
