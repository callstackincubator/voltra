import Foundation
import os
import SwiftUI

/// One entry of a component's `modifiers` prop: `{ "$type": "<name>", ...params }` (ADR 0005).
struct VoltraModifierDescriptor {
  let type: String
  let params: [String: Any]
}

enum VoltraModifierError: Error, Equatable {
  case missingParameter(String)
  case invalidParameter(String)
  case unexpectedParameter(String)
}

/// A native modifier: the parameter names its TypeScript factory may send, and how to build it.
/// Declaring the names makes a renamed parameter fail the parity test instead of silently
/// falling back to a default.
struct VoltraModifierDefinition {
  let parameters: Set<String>
  let make: ([String: Any]) throws -> any ViewModifier
}

/// String-keyed table of native modifiers. Unknown types and parameters that do not decode are
/// logged and skipped, so a bad descriptor never breaks the widget.
enum VoltraModifierRegistry {
  private static let logger = Logger(subsystem: "com.voltra", category: "modifier")

  private(set) static var definitions: [String: VoltraModifierDefinition] = builtInModifierDefinitions

  static var registeredTypes: Set<String> {
    Set(definitions.keys)
  }

  /// Not public yet: user-registered modifiers are future work (ADR 0005).
  static func register(_ type: String, definition: VoltraModifierDefinition) {
    definitions[type] = definition
  }

  /// Decodes the JSON-encoded `modifiers` prop. Entries without a string `$type` are dropped.
  static func parseDescriptors(_ json: String?) -> [VoltraModifierDescriptor] {
    guard let json, let data = json.data(using: .utf8) else { return [] }
    guard let entries = (try? JSONSerialization.jsonObject(with: data)) as? [[String: Any]] else {
      logger.warning("Ignoring modifiers that are not a JSON array of objects")
      return []
    }
    return entries.compactMap { entry in
      guard let type = entry["$type"] as? String else { return nil }
      var params = entry
      params.removeValue(forKey: "$type")
      return VoltraModifierDescriptor(type: type, params: params)
    }
  }

  /// Builds the modifier for a descriptor, or `nil` when the type is unknown.
  static func makeModifier(_ descriptor: VoltraModifierDescriptor) throws -> (any ViewModifier)? {
    guard let definition = definitions[descriptor.type] else { return nil }
    if let unexpected = descriptor.params.keys.sorted().first(where: { !definition.parameters.contains($0) }) {
      throw VoltraModifierError.unexpectedParameter(unexpected)
    }
    return try definition.make(descriptor.params)
  }

  /// Whether the descriptor names a known modifier whose parameters decode, so applying it
  /// changes the view. Hosts use it before dropping a default the modifier would replace.
  static func canApply(_ descriptor: VoltraModifierDescriptor) -> Bool {
    (try? makeModifier(descriptor)) != nil
  }

  static func apply<Content: View>(_ descriptor: VoltraModifierDescriptor, to content: Content) -> AnyView {
    do {
      guard let modifier = try makeModifier(descriptor) else {
        logger.warning("Ignoring unknown modifier \(descriptor.type, privacy: .public)")
        return AnyView(content)
      }
      return erase(content, modifier)
    } catch {
      logger.warning("Ignoring modifier \(descriptor.type, privacy: .public): \(String(describing: error), privacy: .public)")
      return AnyView(content)
    }
  }

  private static func erase<Content: View, Modifier: ViewModifier>(_ content: Content, _ modifier: Modifier) -> AnyView {
    AnyView(content.modifier(modifier))
  }
}

/// Every link of a native modifier chain has this one type, so the outer shape of the view
/// depends only on the length of the list. Inside a link, the erased type is the concrete
/// modifier: value changes of the same modifier diff and animate, while a different `$type` at a
/// position (or an entry that stops decoding) rebuilds the wrapped component.
struct VoltraStableModifier: ViewModifier {
  let descriptor: VoltraModifierDescriptor

  func body(content: Content) -> some View {
    VoltraModifierRegistry.apply(descriptor, to: content)
  }
}

extension View {
  /// Applies native modifiers in array order: the first descriptor is innermost.
  @ViewBuilder
  func applyNativeModifiers(_ descriptors: [VoltraModifierDescriptor]) -> some View {
    if descriptors.isEmpty {
      self
    } else {
      descriptors.reduce(AnyView(self)) { view, descriptor in
        AnyView(view.modifier(VoltraStableModifier(descriptor: descriptor)))
      }
    }
  }
}

// MARK: - Parameter decoding

extension [String: Any] {
  func requiredString(_ key: String) throws -> String {
    guard let string = try optionalString(key) else { throw VoltraModifierError.missingParameter(key) }
    return string
  }

  func optionalString(_ key: String) throws -> String? {
    guard let value = self[key], !(value is NSNull) else { return nil }
    guard let string = value as? String else { throw VoltraModifierError.invalidParameter(key) }
    return string
  }

  func requiredNumber(_ key: String) throws -> CGFloat {
    guard let number = try optionalNumber(key) else { throw VoltraModifierError.missingParameter(key) }
    return number
  }

  /// A color string in any form `style` accepts; JSON `null` means "system default".
  func optionalColor(_ key: String) throws -> Color? {
    guard let string = try optionalString(key) else { return nil }
    guard let color = JSColorParser.parse(string) else { throw VoltraModifierError.invalidParameter(key) }
    return color
  }

  func requiredColor(_ key: String) throws -> Color {
    guard let color = try optionalColor(key) else { throw VoltraModifierError.missingParameter(key) }
    return color
  }

  func requiredEnum<Option: RawRepresentable>(_ key: String, as _: Option.Type = Option.self) throws -> Option where Option.RawValue == String {
    guard let option = try Option(rawValue: requiredString(key)) else { throw VoltraModifierError.invalidParameter(key) }
    return option
  }

  func optionalEnum<Option: RawRepresentable>(_ key: String, as _: Option.Type = Option.self) throws -> Option? where Option.RawValue == String {
    guard let string = try optionalString(key) else { return nil }
    guard let option = Option(rawValue: string) else { throw VoltraModifierError.invalidParameter(key) }
    return option
  }

  func optionalBool(_ key: String) throws -> Bool? {
    guard let value = self[key], !(value is NSNull) else { return nil }
    // JSONSerialization bridges JSON booleans to NSNumber; reject plain numbers.
    guard let number = value as? NSNumber, CFGetTypeID(number) == CFBooleanGetTypeID() else {
      throw VoltraModifierError.invalidParameter(key)
    }
    return number.boolValue
  }

  func optionalNumber(_ key: String) throws -> CGFloat? {
    guard let value = self[key], !(value is NSNull) else { return nil }
    guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID() else {
      throw VoltraModifierError.invalidParameter(key)
    }
    return CGFloat(number.doubleValue)
  }
}
