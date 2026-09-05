import Foundation

public enum VoltraErrors: Error, CustomNSError {
  case unsupportedOS
  case notFound
  case liveActivitiesNotEnabled
  case rendererMismatch
  case unexpectedError(Error)

  public static let errorDomain = "com.callstack.voltra"

  public var errorCode: Int {
    switch self {
    case .unexpectedError: 0
    case .unsupportedOS: 1
    case .notFound: 2
    case .liveActivitiesNotEnabled: 3
    case .rendererMismatch: 4
    }
  }

  public var errorUserInfo: [String: Any] {
    [NSLocalizedDescriptionKey: errorDescription]
  }

  private var errorDescription: String {
    switch self {
    case .unsupportedOS:
      "Live Activities require iOS 16.4 or newer."
    case .notFound:
      "The requested Live Activity was not found."
    case .liveActivitiesNotEnabled:
      "Live Activities are disabled for this app."
    case .rendererMismatch:
      "The Live Activity belongs to a different renderer."
    case let .unexpectedError(error):
      error.localizedDescription
    }
  }
}

@objc public final class VoltraModule: NSObject {
  private let impl: VoltraModuleImpl

  @objc override public init() {
    impl = VoltraModuleImpl()
    super.init()
  }

  @objc public func startMonitoringWithEventHandler(
    _ handler: @escaping (NSString, NSDictionary) -> Void
  ) {
    impl.startMonitoring { eventName, eventData in
      handler(eventName as NSString, eventData as NSDictionary)
    }
  }

  @objc public func stopMonitoring() {
    impl.stopMonitoring()
  }

  // MARK: - Live Activity

  @objc public func startLiveActivity(
    _ jsonString: String,
    options: StartVoltraOptions?,
    completion: @escaping (String?, Error?) -> Void
  ) {
    Task {
      do {
        try completion(await impl.startLiveActivity(jsonString: jsonString, options: options), nil)
      } catch {
        completion(nil, error)
      }
    }
  }

  @objc public func updateLiveActivity(
    _ activityId: String,
    jsonString: String,
    options: UpdateVoltraOptions?,
    completion: @escaping (Error?) -> Void
  ) {
    Task {
      do {
        try await impl.updateLiveActivity(activityId: activityId, jsonString: jsonString, options: options)
        completion(nil)
      } catch {
        completion(error)
      }
    }
  }

  @objc public func startDynamicLiveActivity(
    _ definitionId: String,
    propsJson: String,
    options: StartVoltraOptions?,
    completion: @escaping (String?, Error?) -> Void
  ) {
    Task {
      do {
        try completion(await impl.startDynamicLiveActivity(definitionId: definitionId, propsJson: propsJson, options: options), nil)
      } catch {
        completion(nil, error)
      }
    }
  }

  @objc public func updateDynamicLiveActivity(
    _ activityId: String,
    propsJson: String,
    options: UpdateVoltraOptions?,
    completion: @escaping (Error?) -> Void
  ) {
    Task {
      do {
        try await impl.updateDynamicLiveActivity(activityId: activityId, propsJson: propsJson, options: options)
        completion(nil)
      } catch {
        completion(error)
      }
    }
  }

  @objc public func endLiveActivity(
    _ activityId: String,
    options: EndVoltraOptions?,
    completion: @escaping (Error?) -> Void
  ) {
    Task {
      do {
        try await impl.endLiveActivity(activityId: activityId, options: options)
        completion(nil)
      } catch {
        completion(error)
      }
    }
  }

  @objc public func endAllLiveActivities(_ completion: @escaping (Error?) -> Void) {
    Task {
      do {
        try await impl.endAllLiveActivities()
        completion(nil)
      } catch {
        completion(error)
      }
    }
  }

  @objc public func getLatestVoltraActivityId() -> String? {
    impl.getLatestVoltraActivityId()
  }

  @objc public func listVoltraActivityIds() -> [String] {
    impl.listVoltraActivityIds()
  }

  @objc public func getDynamicLiveActivityDefinitionIds() -> [String] {
    impl.getDynamicLiveActivityDefinitionIds()
  }

  @objc public func isLiveActivityActive(_ activityName: String) -> Bool {
    impl.isLiveActivityActive(name: activityName)
  }

  @objc public func isHeadless() -> Bool {
    impl.isHeadless()
  }

  @objc public func clearHeadless() {
    impl.clearHeadless()
  }

  @objc public func drainDynamicLiveActivityRenderFailures() {
    impl.drainDynamicLiveActivityRenderFailures()
  }

  @objc public func setDynamicLiveActivityRenderFailureListenerActive(_ active: Bool) {
    impl.setDynamicLiveActivityRenderFailureListenerActive(active)
  }

  // MARK: - Images

  @objc public func preloadImages(
    _ images: NSArray,
    completion: @escaping (NSDictionary?, Error?) -> Void
  ) {
    let opts = images.compactMap { $0 as? NSDictionary }.map(PreloadImageOptions.init)
    Task {
      do {
        try completion(await impl.preloadImages(images: opts).toDictionary(), nil)
      } catch {
        completion(nil, error)
      }
    }
  }

  @objc public func reloadLiveActivities(
    _ activityNames: NSArray?,
    completion: @escaping (Error?) -> Void
  ) {
    let names = activityNames?.compactMap { $0 as? String }
    Task {
      do {
        try await impl.reloadLiveActivities(activityNames: names)
        completion(nil)
      } catch {
        completion(error)
      }
    }
  }

  @objc public func reloadDynamicLiveActivities(_ definitionIds: NSArray?, completion: @escaping () -> Void) {
    Task {
      await impl.reloadDynamicLiveActivities(definitionIds: definitionIds?.compactMap { $0 as? String })
      completion()
    }
  }

  @objc public func clearPreloadedImages(_ keys: NSArray?, completion: @escaping () -> Void) {
    Task {
      await impl.clearPreloadedImages(keys: keys?.compactMap { $0 as? String })
      completion()
    }
  }

  // MARK: - Home Screen Widgets

  @objc public func updateDynamicWidget(
    _ dynamicWidgetId: String,
    dynamicWidgetPropsJson: String,
    completion: @escaping (Error?) -> Void
  ) {
    Task {
      do {
        try await impl.updateDynamicWidget(
          dynamicWidgetId: dynamicWidgetId,
          dynamicWidgetPropsJson: dynamicWidgetPropsJson
        )
        completion(nil)
      } catch {
        completion(error)
      }
    }
  }

  @objc public func updateWidget(
    _ widgetId: String,
    jsonString: String,
    options: UpdateWidgetOptions?,
    completion: @escaping (Error?) -> Void
  ) {
    Task {
      do {
        try await impl.updateWidget(widgetId: widgetId, jsonString: jsonString, options: options)
        completion(nil)
      } catch {
        completion(error)
      }
    }
  }

  @objc public func scheduleWidget(
    _ widgetId: String,
    timelineJson: String,
    completion: @escaping (Error?) -> Void
  ) {
    Task {
      do {
        try await impl.scheduleWidget(widgetId: widgetId, timelineJson: timelineJson)
        completion(nil)
      } catch {
        completion(error)
      }
    }
  }

  @objc public func reloadWidgets(_ widgetIds: NSArray?, completion: @escaping () -> Void) {
    Task {
      await impl.reloadWidgets(widgetIds: widgetIds?.compactMap { $0 as? String })
      completion()
    }
  }

  @objc public func clearWidget(_ widgetId: String, completion: @escaping () -> Void) {
    Task {
      await impl.clearWidget(widgetId: widgetId)
      completion()
    }
  }

  @objc public func clearAllWidgets(_ completion: @escaping () -> Void) {
    Task {
      await impl.clearAllWidgets()
      completion()
    }
  }

  @objc public func getActiveWidgets(_ completion: @escaping (NSArray?, Error?) -> Void) {
    Task {
      do {
        try completion(await impl.getActiveWidgets() as NSArray, nil)
      } catch {
        completion(nil, error)
      }
    }
  }

  // MARK: - Widget Server Update Settings

  /// - Returns: an error message when the settings were rejected, or nil when they were applied.
  @objc public func setWidgetServerUpdate(_ settingsJson: String, widgetId: String?) -> NSString? {
    impl.setWidgetServerUpdate(settingsJson: settingsJson, widgetId: widgetId) as NSString?
  }

  @objc public func clearWidgetServerUpdate(_ widgetId: String?) -> NSString? {
    impl.clearWidgetServerUpdate(widgetId: widgetId) as NSString?
  }

  // MARK: - Widget Server Credentials

  @objc public func setWidgetServerCredentials(_ token: String, headers: NSDictionary?) {
    impl.setWidgetServerCredentials(token: token, headers: headers as? [String: String])
  }

  @objc public func clearWidgetServerCredentials() {
    impl.clearWidgetServerCredentials()
  }
}
