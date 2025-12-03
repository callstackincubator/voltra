import SwiftUI
import WidgetKit

struct VoltraUIContentBuilder {
    static func build(components: [VoltraUIComponent], source: String, activityId: String? = nil) -> AnyView {
        // Detect whether any node in the payload applies a glassEffect ordered modifier.
        let usesGlass: Bool = {
            func hasGlass(_ node: VoltraUIComponent) -> Bool {
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

        let tint: Color? = {
            guard let root = components.first else { return nil }
            let helper = VoltraUIHelper()
            if let modifiers = root.modifiers {
                if let bgMod = modifiers.first(where: { $0.name == "backgroundStyle" || $0.name == "background" }),
                   let colorName = bgMod.args?["color"]?.toString(),
                   let color = helper.translateColor(colorName) {
                    return color
                }
            }
            return nil
        }()

        let base: AnyView = {
            // Use pre-parsed components directly
            return AnyView(
                VoltraUI(components: components, callback: { component in
                    VoltraUIEventLogger.writeEvent([
                        "name": "voltraui_event",
                        "source": source,
                        "timestamp": Date().timeIntervalSince1970,
                        "identifier": component.id,
                        "componentType": component.type,
                    ])
                }, activityId: activityId)
                .onAppear {
                    VoltraUIEventLogger.writeEvent([
                        "name": "voltraui_onAppear",
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
            if let tint { return AnyView(base.activityBackgroundTint(tint)) }
            return base
        } else {
            if let tint { return AnyView(base.background(tint)) }
            return base
        }
    }
}

