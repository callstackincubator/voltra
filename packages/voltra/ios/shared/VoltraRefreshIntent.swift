import AppIntents
import WidgetKit

/// An AppIntent that triggers an immediate widget timeline reload.
/// Used by the native refresh button overlay on server-driven widgets.
@available(iOS 17.0, *)
public struct VoltraRefreshIntent: AppIntent {
  public static var title: LocalizedStringResource = "Refresh Widget"
  public static var isDiscoverable: Bool = false

  @Parameter(title: "Widget ID")
  public var widgetId: String?

  public init() {}

  public init(widgetId: String) {
    self.widgetId = widgetId
  }

  public func perform() async throws -> some IntentResult {
    if let widgetId = widgetId {
      let kind = "\(VoltraStorageKeys.widgetKindPrefix)\(widgetId)"
      WidgetCenter.shared.reloadTimelines(ofKind: kind)
    } else {
      WidgetCenter.shared.reloadAllTimelines()
    }
    return .result()
  }
}
