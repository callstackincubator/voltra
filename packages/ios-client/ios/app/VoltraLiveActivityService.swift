//
//  VoltraLiveActivityService.swift
//  Voltra
//
//  Service for managing Voltra Live Activities
//

import ActivityKit
import Foundation

// MARK: - Request Types

/// Parameters for creating a Live Activity
public struct CreateActivityRequest {
  /// Unique identifier for the activity (will be generated if nil)
  public let activityId: String?

  /// URL to open when the Live Activity is tapped
  public let deepLinkUrl: String?

  /// UI JSON data
  public let jsonString: String

  /// Optional date when content becomes stale
  public let staleDate: Date?

  /// Score between 0.0 and 1.0 for prioritization (defaults to 0.0)
  public let relevanceScore: Double

  /// Whether to request push token
  public let pushType: PushType?

  /// If true, ends any existing activities with the same name (defaults to true)
  public let endExistingWithSameName: Bool

  public init(
    activityId: String? = nil,
    deepLinkUrl: String? = nil,
    jsonString: String,
    staleDate: Date? = nil,
    relevanceScore: Double = 0.0,
    pushType: PushType? = nil,
    endExistingWithSameName: Bool = true
  ) {
    self.activityId = activityId
    self.deepLinkUrl = deepLinkUrl
    self.jsonString = jsonString
    self.staleDate = staleDate
    self.relevanceScore = relevanceScore
    self.pushType = pushType
    self.endExistingWithSameName = endExistingWithSameName
  }
}

/// Parameters for updating a Live Activity
public struct UpdateActivityRequest {
  /// New UI JSON data
  public let jsonString: String

  /// Optional date when content becomes stale
  public let staleDate: Date?

  /// Score between 0.0 and 1.0 for prioritization (defaults to 0.0)
  public let relevanceScore: Double

  public init(
    jsonString: String,
    staleDate: Date? = nil,
    relevanceScore: Double = 0.0
  ) {
    self.jsonString = jsonString
    self.staleDate = staleDate
    self.relevanceScore = relevanceScore
  }
}

// MARK: - Service

/// Service for managing Voltra Live Activities
public class VoltraLiveActivityService {
  // MARK: - Availability Checks

  /// Check if Live Activities are supported on this OS version
  public static func isSupported() -> Bool {
    guard #available(iOS 16.4, *) else { return false }
    return true
  }

  /// Check if Live Activities are enabled for this app
  public static func areActivitiesEnabled() -> Bool {
    guard #available(iOS 16.4, *) else { return false }
    return ActivityAuthorizationInfo().areActivitiesEnabled
  }

  // MARK: - Query Operations

  /// Find an activity by its name (activityId)
  public func findActivity(byName name: String) -> Activity<VoltraAttributes>? {
    guard Self.isSupported() else { return nil }
    let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
    return Activity<VoltraAttributes>.activities.first { $0.attributes.name == trimmedName }
  }

  /// Find all activities with the same name
  public func findActivities(byName name: String) -> [Activity<VoltraAttributes>] {
    guard Self.isSupported() else { return [] }
    return Activity<VoltraAttributes>.activities.filter { $0.attributes.name == name }
  }

  /// Get all active Voltra activities
  public func getAllActivities() -> [Activity<VoltraAttributes>] {
    guard Self.isSupported() else { return [] }
    return Array(Activity<VoltraAttributes>.activities)
  }

  /// Get the latest (most recently created) activity across both types
  public func getLatestActivity() -> VoltraActivity? {
    guard Self.isSupported() else { return nil }
    let allActivities = getAllActivities()
    return allActivities.last
  }

  /// Check if an activity with the given name exists across both types
  public func isActivityActive(name: String) -> Bool {
    findActivity(byName: name) != nil || VoltraDynamicLiveActivityCatalog.activities().contains { $0.name == name }
  }

  /// The unified list intentionally erases each engine's concrete attributes type.
  public func getAllActivityReferences() -> [VoltraDynamicLiveActivityReference] {
    guard Self.isSupported() else { return [] }
    let legacy = getAllActivities().map {
      VoltraDynamicLiveActivityReference(id: $0.id, name: $0.attributes.name, definitionId: "legacy")
    }
    return legacy + VoltraDynamicLiveActivityCatalog.activities()
  }

  public func latestActivityId() -> String? {
    getAllActivityReferences().last?.id
  }

  /// The installed capability list is generated during prebuild and does not
  /// depend on Metro, the app group, or a server connection.
  public func dynamicLiveActivityDefinitionIds() -> [String] {
    VoltraDynamicLiveActivityCatalog.definitionIds()
  }

  // MARK: - Create Operations

  /// Create a new Live Activity
  /// - Parameter request: Parameters for creating the activity
  /// - Returns: The created activity's name (activityId)
  /// - Throws: Error if creation fails
  public func createActivity(_ request: CreateActivityRequest) async throws -> String {
    guard Self.isSupported() else {
      throw VoltraLiveActivityError.unsupportedOS
    }
    guard Self.areActivitiesEnabled() else {
      throw VoltraLiveActivityError.liveActivitiesNotEnabled
    }

    // Generate activityId if not provided
    let finalActivityId = request.activityId?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false
      ? request.activityId!.trimmingCharacters(in: .whitespacesAndNewlines)
      : UUID().uuidString

    // End existing activities with the same name if requested
    if request.endExistingWithSameName {
      try await endActivities(byName: finalActivityId)
    }

    // Create attributes and initial state
    let attributes = VoltraAttributes(name: finalActivityId, deepLinkUrl: request.deepLinkUrl)
    let initialState = try VoltraAttributes.ContentState(uiJsonData: request.jsonString)

    // Request the activity
    _ = try Activity.request(
      attributes: attributes,
      content: .init(
        state: initialState,
        staleDate: request.staleDate,
        relevanceScore: request.relevanceScore
      ),
      pushType: request.pushType
    )

    return finalActivityId
  }

  // MARK: - Update Operations

  /// Update an existing Live Activity
  /// - Parameters:
  ///   - activity: The activity to update
  ///   - request: Parameters for updating the activity
  /// - Throws: Error if update fails
  public func updateActivity(
    _ activity: VoltraActivity,
    request: UpdateActivityRequest
  ) async throws {
    guard Self.isSupported() else {
      throw VoltraLiveActivityError.unsupportedOS
    }

    let newState = try VoltraAttributes.ContentState(uiJsonData: request.jsonString)
    await activity.update(
      ActivityContent(
        state: newState,
        staleDate: request.staleDate,
        relevanceScore: request.relevanceScore
      )
    )
  }

  /// Update an activity by name
  /// - Parameters:
  ///   - name: The activity name (activityId)
  ///   - request: Parameters for updating the activity
  /// - Throws: Error if activity not found or update fails
  public func updateActivity(
    byName name: String,
    request: UpdateActivityRequest
  ) async throws {
    guard let activity = findActivity(byName: name) else {
      if VoltraDynamicLiveActivityCatalog.activities().contains(where: { $0.name == name }) {
        throw VoltraLiveActivityError.rendererMismatch
      }
      throw VoltraLiveActivityError.notFound
    }
    try await updateActivity(activity, request: request)
  }

  // MARK: - End Operations

  /// End a specific activity
  /// - Parameter activity: The activity to end
  /// - Parameter dismissalPolicy: How the activity should be dismissed
  public func endActivity(
    _ activity: VoltraActivity,
    dismissalPolicy: ActivityUIDismissalPolicy = .immediate
  ) async {
    guard Self.isSupported() else { return }
    await activity.end(
      ActivityContent(state: activity.content.state, staleDate: nil),
      dismissalPolicy: dismissalPolicy
    )
  }

  /// End an activity by name
  /// - Parameter name: The activity name (activityId)
  /// - Parameter dismissalPolicy: How the activity should be dismissed
  /// - Throws: Error if activity not found
  public func endActivity(
    byName name: String,
    dismissalPolicy: ActivityUIDismissalPolicy = .immediate
  ) async throws {
    if let activity = findActivity(byName: name) {
      await endActivity(activity, dismissalPolicy: dismissalPolicy)
      // Names can collide across engines after a remote start. Shared ending covers both.
      _ = await VoltraDynamicLiveActivityCatalog.end(byName: name, dismissalPolicy: dismissalPolicy)
      return
    }
    guard await VoltraDynamicLiveActivityCatalog.end(byName: name, dismissalPolicy: dismissalPolicy) else {
      throw VoltraLiveActivityError.notFound
    }
  }

  /// End all activities with the same name
  /// - Parameter name: The activity name (activityId)
  public func endActivities(byName name: String) async throws {
    guard Self.isSupported() else { return }
    let activities = findActivities(byName: name)
    for activity in activities {
      await endActivity(activity)
    }
    _ = await VoltraDynamicLiveActivityCatalog.end(byName: name, dismissalPolicy: .immediate)
  }

  /// End all Voltra Live Activities
  public func endAllActivities() async {
    guard Self.isSupported() else { return }
    let activities = getAllActivities()
    for activity in activities {
      await endActivity(activity)
    }
    await VoltraDynamicLiveActivityCatalog.endAll(dismissalPolicy: .immediate)
  }

  // MARK: - Dynamic operations

  public func createDynamicActivity(_ request: VoltraDynamicLiveActivityCreateRequest) async throws -> String {
    guard Self.isSupported() else { throw VoltraLiveActivityError.unsupportedOS }
    guard Self.areActivitiesEnabled() else { throw VoltraLiveActivityError.liveActivitiesNotEnabled }
    guard VoltraDynamicLiveActivityCatalog.contains(request.definitionId) else {
      throw VoltraDynamicLiveActivityError.unknownDefinition(request.definitionId)
    }
    do {
      let source = try VoltraDynamicLiveActivityBundleSource.load(definitionId: request.definitionId)
      guard VoltraJSRenderer.evaluateLiveActivityBundle(source: source, definitionId: request.definitionId) else {
        throw VoltraDynamicLiveActivityError.resourceUnavailable(
          NSError(domain: "VoltraDynamicLiveActivity", code: -1, userInfo: [NSLocalizedDescriptionKey: "Dynamic Live Activity bundle could not be evaluated."])
        )
      }
    } catch let error as VoltraDynamicLiveActivityError {
      throw error
    } catch {
      throw VoltraDynamicLiveActivityError.resourceUnavailable(error)
    }
    try VoltraDynamicLiveActivityPayloadValidator.validate(
      name: request.name,
      deepLinkUrl: request.deepLinkUrl,
      props: request.props
    )
    if request.name.isEmpty == false {
      try await endActivities(byName: request.name)
    }
    guard try await VoltraDynamicLiveActivityCatalog.create(request) else {
      throw VoltraDynamicLiveActivityError.unknownDefinition(request.definitionId)
    }
    return request.name
  }

  public func updateDynamicActivity(byName name: String, request: VoltraDynamicLiveActivityUpdateRequest) async throws {
    guard Self.isSupported() else { throw VoltraLiveActivityError.unsupportedOS }
    if findActivity(byName: name) != nil {
      throw VoltraDynamicLiveActivityError.rendererMismatch
    }
    try VoltraDynamicLiveActivityPayloadValidator.validateContentState(request.props)
    guard try await VoltraDynamicLiveActivityCatalog.update(byName: name, request: request) else {
      throw VoltraLiveActivityError.notFound
    }
  }

  /// Refetch and re-evaluate only invalidated Dynamic Live Activity definitions,
  /// then update their active instances with their current state to trigger a
  /// WidgetKit render. Legacy activities are deliberately untouched.
  public func reloadDynamicActivities(definitionIds: [String]?) async {
    #if DEBUG
      let requested = definitionIds.map(Set.init)
      let ids = requested ?? Set(dynamicLiveActivityDefinitionIds())
      var refreshed = Set<String>()
      for definitionId in ids.sorted() {
        guard VoltraDynamicLiveActivityCatalog.contains(definitionId) else { continue }
        do {
          let source = try VoltraDynamicLiveActivityBundleSource.load(definitionId: definitionId)
          guard VoltraJSRenderer.evaluateLiveActivityBundle(source: source, definitionId: definitionId) else {
            throw VoltraDynamicLiveActivityError.resourceUnavailable(
              NSError(domain: "VoltraDynamicLiveActivity", code: -2, userInfo: [NSLocalizedDescriptionKey: "Dynamic Live Activity bundle could not be evaluated."])
            )
          }
          refreshed.insert(definitionId)
        } catch {
          VoltraLogger.activity.error("Failed to refresh Dynamic Live Activity definition '\(definitionId)': \(error)")
        }
      }
      await VoltraDynamicLiveActivityCatalog.reload(definitionIds: refreshed)
    #endif
  }

  // MARK: - Monitoring

  private var activityManager: VoltraLiveActivityManager?

  /// Start monitoring all Live Activities, push tokens, and lifecycle state changes.
  public func startMonitoring(enablePush: Bool) {
    stopMonitoring()

    let onTokenUpdated: (@Sendable (String, String) -> Void)?
    let onPushToStartUpdated: (@Sendable (String) -> Void)?

    if enablePush {
      onTokenUpdated = { activityName, token in
        VoltraEventBus.shared.send(.tokenReceived(activityName: activityName, pushToken: token))
      }
      onPushToStartUpdated = { token in
        VoltraEventBus.shared.send(.pushToStartTokenReceived(token: token))
      }
    } else {
      onTokenUpdated = nil
      onPushToStartUpdated = nil
    }

    let manager = VoltraLiveActivityManager(
      onTokenUpdated: onTokenUpdated,
      onPushToStartUpdated: onPushToStartUpdated,
      onStateChanged: { activityName, state in
        VoltraEventBus.shared.send(.stateChange(activityName: activityName, state: state))
      }
    )

    activityManager = manager
    Task { await manager.startObserving() }
  }

  /// Stop all monitoring and cancel every outstanding observation task.
  public func stopMonitoring() {
    let manager = activityManager
    activityManager = nil
    Task { await manager?.stopObserving() }
  }
}

// MARK: - Errors

public enum VoltraLiveActivityError: Error {
  case unsupportedOS
  case notFound
  case liveActivitiesNotEnabled
  case rendererMismatch
}
