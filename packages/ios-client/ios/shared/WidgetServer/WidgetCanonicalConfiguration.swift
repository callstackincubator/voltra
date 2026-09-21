import Foundation

/// Turns a merged `env.configuration` map into the canonical form ADR 0007 sends on the wire and
/// hashes into an instance key.
///
/// Canonical serialization: keys sorted by Unicode scalar (code point), no whitespace, values as
/// JSON strings. Decoded, it is byte for byte what the widget sees as `env.configuration`, so
/// server and widget agree by construction. Both platforms produce this same string for the same
/// map, which is what lets the hash below be a stable, cross-platform instance identity.
public enum WidgetCanonicalConfiguration {
  /// The canonical JSON string for `configuration`, or nil when the map is empty — a widget with
  /// no configuration parameters has exactly one instance, the widget scope, and sends neither
  /// `instance` nor `configuration`.
  public static func canonicalize(_ configuration: [String: String]) -> String? {
    guard !configuration.isEmpty else { return nil }

    let sortedKeys = configuration.keys.sorted { lhs, rhs in
      lhs.unicodeScalars.lexicographicallyPrecedes(rhs.unicodeScalars) { $0.value < $1.value }
    }

    var pieces: [String] = []
    pieces.reserveCapacity(sortedKeys.count)
    for key in sortedKeys {
      let value = configuration[key] ?? ""
      pieces.append("\(encodeJSONString(key)):\(encodeJSONString(value))")
    }

    return "{" + pieces.joined(separator: ",") + "}"
  }

  /// The instance key for `configuration`: FNV-1a, 32-bit, over the UTF-8 bytes of the canonical
  /// serialization, rendered as 8 lowercase hex digits. Nil when the map is empty, matching
  /// `canonicalize`.
  ///
  /// FNV-1a was picked for being small, dependency-free, and trivial to reproduce identically in
  /// Kotlin — this is not a cryptographic hash, and nothing about instance identity depends on
  /// collision resistance beyond "different configurations usually get different keys".
  public static func key(_ configuration: [String: String]) -> String? {
    guard let canonical = canonicalize(configuration) else { return nil }
    return fnv1a32Hex(canonical)
  }

  /// Minimal, dependency-free JSON string encoder — just enough for configuration keys/values,
  /// which are plain strings, not arbitrary JSON. Escapes the characters `JSONSerialization` would.
  private static func encodeJSONString(_ value: String) -> String {
    var result = "\""
    for scalar in value.unicodeScalars {
      switch scalar {
      case "\"": result += "\\\""
      case "\\": result += "\\\\"
      case "\n": result += "\\n"
      case "\r": result += "\\r"
      case "\t": result += "\\t"
      default:
        if scalar.value < 0x20 {
          result += String(format: "\\u%04x", scalar.value)
        } else {
          result.unicodeScalars.append(scalar)
        }
      }
    }
    result += "\""
    return result
  }

  private static let fnvOffsetBasis: UInt32 = 0x811C_9DC5
  private static let fnvPrime: UInt32 = 0x0100_0193

  private static func fnv1a32Hex(_ value: String) -> String {
    var hash = fnvOffsetBasis
    for byte in Array(value.utf8) {
      hash ^= UInt32(byte)
      hash = hash &* fnvPrime
    }
    return String(format: "%08x", hash)
  }
}
