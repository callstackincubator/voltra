import Foundation

enum DynamicWidgetPropsCodec {
  static let emptyDynamicWidgetPropsJSON = "{}"

  private static let currentStorageVersion = 1

  static func encodeStorageEntry(dynamicWidgetPropsJSON: String) throws -> String {
    let dynamicWidgetProps: JSONValue
    do {
      dynamicWidgetProps = try JSONValue.parse(from: dynamicWidgetPropsJSON)
    } catch {
      throw DynamicWidgetPropsStoreError.invalidJSON
    }

    guard case .object = dynamicWidgetProps else {
      throw DynamicWidgetPropsStoreError.topLevelValueMustBeObject
    }

    let entry = DynamicWidgetPropsStorageEntry(
      dynamicWidgetPropsStorageVersion: currentStorageVersion,
      dynamicWidgetProps: dynamicWidgetProps
    )
    let data = try JSONEncoder().encode(entry)
    guard let json = String(data: data, encoding: .utf8) else {
      throw DynamicWidgetPropsStoreError.invalidJSON
    }
    return json
  }

  static func decodeDynamicWidgetProps(storageEntryJSON: String?) -> String {
    guard
      let storageEntryJSON,
      let data = storageEntryJSON.data(using: .utf8),
      let entry = try? JSONDecoder().decode(DynamicWidgetPropsStorageEntry.self, from: data),
      entry.dynamicWidgetPropsStorageVersion == currentStorageVersion,
      case .object = entry.dynamicWidgetProps,
      let dynamicWidgetPropsData = try? JSONEncoder().encode(entry.dynamicWidgetProps),
      let dynamicWidgetPropsJSON = String(data: dynamicWidgetPropsData, encoding: .utf8)
    else {
      return emptyDynamicWidgetPropsJSON
    }

    return dynamicWidgetPropsJSON
  }
}

private struct DynamicWidgetPropsStorageEntry: Codable {
  let dynamicWidgetPropsStorageVersion: Int
  let dynamicWidgetProps: JSONValue
}
