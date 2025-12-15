import SwiftUI
import WidgetKit

struct VoltraContentBuilder {
    static func build(nodes: [VoltraNode], source: String, activityId: String, activityBackgroundTint: String? = nil) -> AnyView {
        let base: AnyView = {
            // Use pre-parsed nodes directly
            return AnyView(
                Voltra(nodes: nodes, callback: { node in
                    VoltraEventLogger.writeEvent([
                        "name": "voltra_event",
                        "source": source,
                        "timestamp": Date().timeIntervalSince1970,
                        "identifier": node.id,
                        "nodeType": node.type,
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

