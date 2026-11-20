import AppIntents
import WidgetKit

/// The retry button of the Dynamic Widget dev error view (ADR 0013 §4).
///
/// A timeline reload is the whole retry: the dev provider fetches the bundle from Metro and
/// evaluates it on every `getTimeline`, so reloading re-runs the Bundle and Evaluate stages and the
/// View then renders again. The type name is a shipped contract once a release carries it.
@available(iOS 17.0, *)
public struct VoltraDynamicWidgetRetryIntent: AppIntent {
  public static var title: LocalizedStringResource = "Retry Dynamic Widget"
  public static var isDiscoverable: Bool = false

  @Parameter(title: "Widget ID")
  public var widgetId: String

  public init() {}

  public init(widgetId: String) {
    self.widgetId = widgetId
  }

  public func perform() async throws -> some IntentResult {
    WidgetCenter.shared.reloadTimelines(ofKind: VoltraWidgetKind.kind(for: widgetId))
    return .result()
  }
}
