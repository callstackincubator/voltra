import Foundation

public enum VoltraErrors: Error {
  case unsupportedOS
  case notFound
  case liveActivitiesNotEnabled
  case unexpectedError(Error)
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

  @objc public func isLiveActivityActive(_ activityName: String) -> Bool {
    impl.isLiveActivityActive(name: activityName)
  }

  @objc public func isHeadless() -> Bool {
    impl.isHeadless()
  }

  @objc public func clearHeadless() {
    impl.clearHeadless()
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

  @objc public func clearPreloadedImages(_ keys: NSArray?, completion: @escaping () -> Void) {
    Task {
      await impl.clearPreloadedImages(keys: keys?.compactMap { $0 as? String })
      completion()
    }
  }

  // MARK: - Home Screen Widgets

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

  // MARK: - Widget Server Credentials

  @objc public func setWidgetServerCredentials(_ token: String, headers: NSDictionary?) {
    impl.setWidgetServerCredentials(token: token, headers: headers as? [String: String])
  }

  @objc public func clearWidgetServerCredentials() {
    impl.clearWidgetServerCredentials()
  }
}
