import SwiftUI
import WidgetKit

struct VoltraContentBuilder {
    static func build(components: [VoltraComponent], source: String, activityId: String, activityBackgroundTint: String? = nil) -> AnyView {
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

         if let tint = activityBackgroundTint,
            let color = VoltraHelper().translateColor(tint) {
            return AnyView(base.activityBackgroundTint(color))
        }

        return base
    }
}

