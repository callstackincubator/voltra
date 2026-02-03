import ActivityKit
import Compression
import ExpoModulesCore
import Foundation
import WidgetKit

public class VoltraModule: Module {
  public enum VoltraErrors: Error {
    case unsupportedOS
    case notFound
    case liveActivitiesNotEnabled
    case unexpectedError(Error)
  }

  private var impl: VoltraModuleImpl!

  public func definition() -> ModuleDefinition {
    Name("VoltraModule")

    // UI component events forwarded from the extension + push/state events
    Events("interaction", "activityTokenReceived", "activityPushToStartTokenReceived", "stateChange")

    OnCreate {
      self.impl = VoltraModuleImpl()
    }

    OnStartObserving {
      // Subscribe to event bus and forward events to React Native
      VoltraEventBus.shared.subscribe { [weak self] eventType, eventData in
        self?.sendEvent(eventType, eventData)
      }

      // Start monitoring live activities and push tokens
      self.impl.startMonitoring()
    }

    OnStopObserving {
      self.impl.stopMonitoring()
    }

    AsyncFunction("startLiveActivity") { (jsonString: String, options: StartVoltraOptions?) async throws -> String in
      return try await self.impl.startLiveActivity(jsonString: jsonString, options: options)
    }

    AsyncFunction("updateLiveActivity") { (activityId: String, jsonString: String, options: UpdateVoltraOptions?) async throws in
      try await self.impl.updateLiveActivity(activityId: activityId, jsonString: jsonString, options: options)
    }

    AsyncFunction("endLiveActivity") { (activityId: String, options: EndVoltraOptions?) async throws in
      try await self.impl.endLiveActivity(activityId: activityId, options: options)
    }

    // Preferred name mirroring iOS terminology
    AsyncFunction("endAllLiveActivities") { () async throws in
      try await self.impl.endAllLiveActivities()
    }

    // Return the latest (most recently created) Voltra Live Activity ID, if any.
    // Useful to rebind after Fast Refresh in development.
    AsyncFunction("getLatestVoltraActivityId") { () -> String? in
      return self.impl.getLatestVoltraActivityId()
    }

    // Debug helper: list all running Voltra Live Activity IDs
    AsyncFunction("listVoltraActivityIds") { () -> [String] in
      return self.impl.listVoltraActivityIds()
    }

    Function("isLiveActivityActive") { (activityName: String) -> Bool in
      return self.impl.isLiveActivityActive(name: activityName)
    }

    Function("isHeadless") { () -> Bool in
      return self.impl.wasLaunchedInBackground
    }

    // Preload images to App Group storage for use in Live Activities
    AsyncFunction("preloadImages") { (images: [PreloadImageOptions]) async throws -> PreloadImagesResult in
      return try await self.impl.preloadImages(images: images)
    }

    // Reload Live Activities to pick up preloaded images
    // This triggers an update with the same content state, forcing SwiftUI to re-render
    AsyncFunction("reloadLiveActivities") { (activityNames: [String]?) async throws in
      try await self.impl.reloadLiveActivities(activityNames: activityNames)
    }

    // Clear preloaded images from App Group storage
    AsyncFunction("clearPreloadedImages") { (keys: [String]?) async in
      await self.impl.clearPreloadedImages(keys: keys)
    }

    // MARK: - Home Screen Widget Functions

    // Update a home screen widget with new content
    AsyncFunction("updateWidget") { (widgetId: String, jsonString: String, options: UpdateWidgetOptions?) async throws in
      try await self.impl.updateWidget(widgetId: widgetId, jsonString: jsonString, options: options)
    }

    // Schedule a widget timeline with multiple entries
    AsyncFunction("scheduleWidget") { (widgetId: String, timelineJson: String) async throws in
      try await self.impl.scheduleWidget(widgetId: widgetId, timelineJson: timelineJson)
    }

    // Reload widget timelines to refresh their content
    AsyncFunction("reloadWidgets") { (widgetIds: [String]?) async in
      await self.impl.reloadWidgets(widgetIds: widgetIds)
    }

    // Clear a widget's stored data
    AsyncFunction("clearWidget") { (widgetId: String) async in
      await self.impl.clearWidget(widgetId: widgetId)
    }

    // Clear all widgets' stored data
    AsyncFunction("clearAllWidgets") { () async in
      await self.impl.clearAllWidgets()
    }

    AsyncFunction("getActiveWidgets") { () async throws -> [[String: String]] in
      return try await self.impl.getActiveWidgets()
    }

    View(VoltraRN.self) {
      Prop("payload") { (view, payload: String) in
        view.setPayload(payload)
      }

      Prop("viewId") { (view, viewId: String) in
        view.setViewId(viewId)
      }
    }
  }
}
