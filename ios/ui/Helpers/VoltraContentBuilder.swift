import SwiftUI
import WidgetKit

struct VoltraContentBuilder {
    static func build(components: [VoltraComponent], source: String, activityId: String) -> AnyView {
        // Detect whether any node in the payload applies a glassEffect ordered modifier.
        let usesGlass: Bool = {
            func hasGlass(_ node: VoltraComponent) -> Bool {
                if let mods = node.modifiers, mods.contains(where: { $0.name == "glassEffect" }) { return true }
                if let kids = node.children {
                    switch kids {
                    case .component(let component):
                        return hasGlass(component)
                    case .components(let components):
                        return components.contains(where: { hasGlass($0) })
                    case .text:
                        return false
                    }
                }
                return false
            }
            return components.contains(where: { hasGlass($0) })
        }()

        let base: AnyView = {
            // Use pre-parsed components directly
            return AnyView(
                Voltra(components: components, callback: { component in
                    VoltraEventLogger.writeEvent([
                        "name": "voltra_event",
                        "source": source,
                        "timestamp": Date().timeIntervalSince1970,
                        "identifier": component.id,
                        "componentType": component.type,
                    ])
                }, activityId: activityId)
                .onAppear {
                    VoltraEventLogger.writeEvent([
                        "name": "voltra_onAppear",
                        "source": source,
                        "timestamp": Date().timeIntervalSince1970,
                    ])
                }
            )
        }()

        if #available(iOS 17.0, *) {
            // When using Liquid Glass, default the activity background to clear so the wallpaper can
            // show through and the glass can refract it. Authors can still override by providing an
            // explicit backgroundStyle on the root.
            if usesGlass {
                return AnyView(base.activityBackgroundTint(.clear))
            }
            return base
        } else {
            return base
        }
    }
}

