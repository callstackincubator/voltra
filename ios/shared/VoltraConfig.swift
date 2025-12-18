import Foundation

/// Shared configuration utilities for Voltra
/// Centralizes access to App Group identifiers and other configuration
public enum VoltraConfig {
    /// Get the App Group identifier from Info.plist
    /// Checks both `Voltra_AppGroupIdentifier` and legacy `AppGroupIdentifier` keys
    public static func groupIdentifier() -> String? {
        Bundle.main.object(forInfoDictionaryKey: "Voltra_AppGroupIdentifier") as? String
            ?? Bundle.main.object(forInfoDictionaryKey: "AppGroupIdentifier") as? String
    }
}
