import Foundation

/// A modifier that can be applied to a VoltraNode
public struct VoltraModifier: Codable, Hashable {
    /// The modifier name (e.g., "frame", "padding", "foregroundStyle")
    public let name: String

    /// The modifier arguments
    public let args: [String: JSONValue]?

    /// Initialize from short name and args
    public init(name: String, args: [String: JSONValue]? = nil) {
        self.name = name
        self.args = args
    }
}