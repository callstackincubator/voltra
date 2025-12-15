import SwiftUI
import WidgetKit

struct VoltraContentBuilder {
    static func build(root: VoltraNode, source: String, activityId: String, activityBackgroundTint: String? = nil) -> AnyView {
        let base: AnyView = {
            // Use pre-parsed root node directly
            return AnyView(
                Voltra(root: root, callback: { element in
                    VoltraEventLogger.writeEvent([
                        "name": "voltra_event",
                        "source": source,
                        "timestamp": Date().timeIntervalSince1970,
                        "identifier": element.id,
                        "nodeType": element.type,
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
            let color = JSColorParser.parse(tint) {
            return AnyView(base.activityBackgroundTint(color))
        }

        return base
    }
}

