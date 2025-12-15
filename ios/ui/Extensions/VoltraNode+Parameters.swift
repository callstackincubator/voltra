import Foundation

extension VoltraNode {
    /// Generic type-safe parameter accessor
    /// - Parameter type: The parameter struct type to decode
    /// - Returns: Decoded parameters (uses empty dict if props is nil)
    public func parameters<T: ComponentParameters>(_ type: T.Type) -> T {
        // Use empty dictionary if props is nil (components may have no parameters)
        let raw = props ?? [:]
        // Convert JSONValue dictionary to Data
        let dict = raw.mapValues { $0.toAny() }
        guard let data = try? JSONSerialization.data(withJSONObject: dict, options: []) else {
            // Fallback to empty data if serialization fails
            let emptyData = try! JSONSerialization.data(withJSONObject: [:], options: [])
            return (try? JSONDecoder().decode(T.self, from: emptyData)) ?? (try! JSONDecoder().decode(T.self, from: Data("{}".utf8)))
        }
        if let decoded = try? JSONDecoder().decode(T.self, from: data) {
            return decoded
        }
        // If decoding fails, try with empty dictionary (handles cases where parameters struct exists but has no fields)
        if let emptyData = try? JSONSerialization.data(withJSONObject: [:], options: []),
           let decoded = try? JSONDecoder().decode(T.self, from: emptyData) {
            return decoded
        }
        // Last resort: try decoding empty JSON object
        if let decoded = try? JSONDecoder().decode(T.self, from: Data("{}".utf8)) {
            return decoded
        }
        // This should never happen if T is a valid ComponentParameters struct
        fatalError("Failed to decode parameters of type \(T.self) for component type \(self.type)")
    }
}