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
}

/// String-keyed table of native modifier factories. Unknown types and parameters that do not
/// decode are logged and skipped, so a bad descriptor never breaks the widget.
enum VoltraModifierRegistry {
  typealias Factory = ([String: Any]) throws -> any ViewModifier

  private static let logger = Logger(subsystem: "com.voltra", category: "modifier")

  private(set) static var factories: [String: Factory] = builtInModifierFactories

  static var registeredTypes: Set<String> {
    Set(factories.keys)
  }

  /// Not public yet: user-registered modifiers are future work (ADR 0005).
  static func register(_ type: String, factory: @escaping Factory) {
    factories[type] = factory
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
    guard let factory = factories[descriptor.type] else { return nil }
    return try factory(descriptor.params)
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

/// Every link of a native modifier chain has this one type, so the erased shape of the view
/// depends only on the length of the list. Value changes between timeline entries or activity
/// states therefore diff instead of rebuilding the subtree.
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
    guard let value = self[key] else { throw VoltraModifierError.missingParameter(key) }
    guard let string = value as? String else { throw VoltraModifierError.invalidParameter(key) }
    return string
  }

  func optionalBool(_ key: String) throws -> Bool? {
    guard let value = self[key] else { return nil }
    // JSONSerialization bridges JSON booleans to NSNumber; reject plain numbers.
    guard let number = value as? NSNumber, CFGetTypeID(number) == CFBooleanGetTypeID() else {
      throw VoltraModifierError.invalidParameter(key)
    }
    return number.boolValue
  }

  func optionalNumber(_ key: String) throws -> CGFloat? {
    guard let value = self[key] else { return nil }
    guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID() else {
      throw VoltraModifierError.invalidParameter(key)
    }
    return CGFloat(number.doubleValue)
  }
}
