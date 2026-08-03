import ActivityKit
import Foundation

public struct VoltraDynamicLiveActivityCreateRequest {
  public let definitionId: String
  public let name: String
  public let deepLinkUrl: String?
  public let props: [String: VoltraDynamicLiveActivityJSONValue]
  public let staleDate: Date?
  public let relevanceScore: Double
  public let pushType: PushType?
}

public struct VoltraDynamicLiveActivityUpdateRequest {
  public let props: [String: VoltraDynamicLiveActivityJSONValue]
  public let staleDate: Date?
  public let relevanceScore: Double
}

public struct VoltraDynamicLiveActivityReference: Hashable {
  public let id: String
  public let name: String
  public let definitionId: String
}

/// Generic ActivityKit operations called by the generated catalog. The catalog
/// supplies the concrete generated Attributes type without exposing it to the
/// legacy service or the React Native bridge.
public enum VoltraDynamicLiveActivityOperations {
  public static func create<Attributes: VoltraDynamicLiveActivityDefinition>(
    _: Attributes.Type,
    request: VoltraDynamicLiveActivityCreateRequest
  ) async throws {
    let attributes = Attributes(name: request.name, deepLinkUrl: request.deepLinkUrl)
    let state = VoltraDynamicLiveActivityContentState(props: request.props)
    _ = try Activity.request(
      attributes: attributes,
      content: ActivityContent(state: state, staleDate: request.staleDate, relevanceScore: request.relevanceScore),
      pushType: request.pushType
    )
  }

  public static func update<Attributes: VoltraDynamicLiveActivityDefinition>(
    _: Attributes.Type,
    byName name: String,
    request: VoltraDynamicLiveActivityUpdateRequest
  ) async -> Bool {
    let activities = Activity<Attributes>.activities.filter { $0.attributes.name == name }
    for activity in activities {
      // State is deliberately replaced in full; V1 does not merge props.
      await activity.update(ActivityContent(
        state: VoltraDynamicLiveActivityContentState(props: request.props),
        staleDate: request.staleDate,
        relevanceScore: request.relevanceScore
      ))
    }
    return !activities.isEmpty
  }

  public static func end<Attributes: VoltraDynamicLiveActivityDefinition>(
    _: Attributes.Type,
    byName name: String,
    dismissalPolicy: ActivityUIDismissalPolicy
  ) async -> Bool {
    let activities = Activity<Attributes>.activities.filter { $0.attributes.name == name }
    for activity in activities {
      await activity.end(ActivityContent(state: activity.content.state, staleDate: nil), dismissalPolicy: dismissalPolicy)
    }
    return !activities.isEmpty
  }

  public static func endAll<Attributes: VoltraDynamicLiveActivityDefinition>(
    _: Attributes.Type,
    dismissalPolicy: ActivityUIDismissalPolicy
  ) async {
    for activity in Activity<Attributes>.activities {
      await activity.end(ActivityContent(state: activity.content.state, staleDate: nil), dismissalPolicy: dismissalPolicy)
    }
  }

  public static func activities<Attributes: VoltraDynamicLiveActivityDefinition>(
    _: Attributes.Type
  ) -> [VoltraDynamicLiveActivityReference] {
    Activity<Attributes>.activities.map {
      VoltraDynamicLiveActivityReference(id: $0.id, name: $0.attributes.name, definitionId: Attributes.definitionId)
    }
  }

  public static func reload<Attributes: VoltraDynamicLiveActivityDefinition>(
    _: Attributes.Type
  ) async {
    for activity in Activity<Attributes>.activities {
      await activity.update(ActivityContent(
        state: activity.content.state,
        staleDate: nil,
        relevanceScore: 0.0
      ))
    }
  }
}
