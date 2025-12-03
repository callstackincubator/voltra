import AppIntents
import ActivityKit

struct VoltraInteractionIntent: AppIntent {
    static var title: LocalizedStringResource = "Interact with Live Activity"
    static var description: LocalizedStringResource = "Interact with a Live Activity component"

    // The ID of the activity
    @Parameter(title: "Activity ID")
    var activityId: String

    // The ID of the component in your JSON (e.g., "button_1", "pause_btn")
    @Parameter(title: "Component ID")
    var componentId: String

    // Optional: Only if you need to pass extra data (like "true/false" or "toggle")
    @Parameter(title: "Payload")
    var payload: String?

    init() {}

    init(activityId: String, componentId: String, payload: String? = nil) {
        self.activityId = activityId
        self.componentId = componentId
        self.payload = payload
    }

    func perform() async throws -> some IntentResult {
        VoltraUIEventLogger.writeEvent([
            "name": "voltraui_event",
            "source": activityId,
            "timestamp": Date().timeIntervalSince1970,
            "identifier": componentId,
            "payload": payload
        ])

        return .result()
    }
}

