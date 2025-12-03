import Foundation

public struct VoltraUIEventLogger {
    static func groupIdentifier() -> String? {
        Bundle.main.object(forInfoDictionaryKey: "VoltraUI_AppGroupIdentifier") as? String
    }

    static func writeEvent(_ payload: [String: Any]) {
        print("Writing event: \(payload)")
        print("Group identifier: \(groupIdentifier() ?? "No group identifier")")
        guard let group = groupIdentifier(),
              let defaults = UserDefaults(suiteName: group),
              JSONSerialization.isValidJSONObject(payload),
              let data = try? JSONSerialization.data(withJSONObject: payload, options: [])
        else { return }
        let jsonString = String(data: data, encoding: .utf8) ?? "{}"

        var queue = defaults.array(forKey: "VoltraUI_EventsQueue") as? [String] ?? []
        queue.append(jsonString)
        defaults.set(queue, forKey: "VoltraUI_EventsQueue")
        defaults.synchronize()
    }
}

