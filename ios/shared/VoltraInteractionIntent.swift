import AppIntents
import ActivityKit

public struct VoltraInteractionIntent: LiveActivityIntent {
    public static var title: LocalizedStringResource = "Interact"
    public static var isDiscoverable: Bool = false

    // The ID of the activity
    @Parameter(title: "Activity ID")
    var activityId: String

    // The ID of the component in your JSON (e.g., "button_1", "pause_btn")
    @Parameter(title: "Component ID")
    var componentId: String
    
    // Optional: Only if you need to pass extra data (like "true/false" or "toggle")
    @Parameter(title: "Payload")
    var payload: String?

    public init() {}
    
    public init(activityId: String, componentId: String, payload: String? = nil) {
        self.activityId = activityId
        self.componentId = componentId
        self.payload = payload
    }

    public func perform() async throws -> some IntentResult {
        print("User interacted with component: \(componentId)")
        
        VoltraEventLogger.writeEvent([
            "type": "interaction",
            "source": activityId,
            "timestamp": Date().timeIntervalSince1970,
            "identifier": componentId,
            "payload": payload
        ])

        return .result()
    }
}
