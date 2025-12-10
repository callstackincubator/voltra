import SwiftUI

/// Voltra: Mask
///
/// Masks content using any Voltra element as the mask shape.
/// The alpha channel of the maskElement determines visibility.
@available(iOS 15.0, macOS 12.0, *)
public struct VoltraMask: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        // Get the mask element from component props
        let maskElement = component.componentProp("maskElement")
        
        // Render children as the content to be masked
        VoltraChildrenView(component: component)
            .mask {
                if let maskElement = maskElement {
                    VoltraChildrenRenderer(children: maskElement)
                } else {
                    // Fallback: if no maskElement provided, show nothing
                    EmptyView()
                }
            }
            .voltraModifiers(component)
    }
}

