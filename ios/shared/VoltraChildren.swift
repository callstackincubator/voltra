import Foundation

/// Represents the different types of children a VoltraNode can have
public indirect enum VoltraChildren: Hashable {
    case node(VoltraNode)
    case nodes([VoltraNode])
    case text(String)

    /// Initialize from JSONValue
    public init?(from json: JSONValue) throws {
        switch json {
        case .string(let text):
            self = .text(text)
        case .int(let num):
            self = .text(String(num))
        case .double(let num):
            self = .text(String(num))
        case .bool(let val):
            self = .text(String(val))
        case .object:
            self = .node(try VoltraNode(from: json))
        case .array(let items):
            // Array of nodes
            let nodes = try items.compactMap { item -> VoltraNode? in
                guard case .object = item else { return nil }
                return try VoltraNode(from: item)
            }
            guard !nodes.isEmpty else { return nil }
            self = .nodes(nodes)
        case .null:
            return nil
        }
    }
}