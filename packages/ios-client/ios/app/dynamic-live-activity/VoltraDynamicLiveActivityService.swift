import ActivityKit
import Foundation

/// App-process orchestration for the dynamic renderer. The legacy service keeps
/// only thin cross-engine coordination points and delegates feature-specific
/// catalog, bundle, payload, and reload behavior here.
final class VoltraDynamicLiveActivityService {
  private let chronology: VoltraLiveActivityChronology

  init(chronology: VoltraLiveActivityChronology = .shared) {
    self.chronology = chronology
  }

  func isActive(name: String) -> Bool {
    activityReferences().contains { $0.name == name }
  }

  func activityReferences() -> [VoltraDynamicLiveActivityReference] {
    VoltraDynamicLiveActivityRegistry.shared.activities()
  }

  func definitionIds() -> [String] {
    VoltraDynamicLiveActivityRegistry.shared.definitionIds()
  }

  func create(_ request: VoltraDynamicLiveActivityCreateRequest) async throws -> String {
    guard VoltraDynamicLiveActivityRegistry.shared.contains(request.definitionId) else {
      throw VoltraDynamicLiveActivityError.unknownDefinition(request.definitionId)
    }
    do {
      let source = try await VoltraDynamicLiveActivityBundleSource.loadForApp(definitionId: request.definitionId)
      guard VoltraJSRenderer.evaluateLiveActivityBundle(source: source, definitionId: request.definitionId) else {
        throw VoltraDynamicLiveActivityError.resourceUnavailable(
          NSError(
            domain: "VoltraDynamicLiveActivity",
            code: -1,
            userInfo: [NSLocalizedDescriptionKey: "Dynamic Live Activity bundle could not be evaluated."]
          )
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
    guard let activity = try await VoltraDynamicLiveActivityRegistry.shared.create(request) else {
      throw VoltraDynamicLiveActivityError.unknownDefinition(request.definitionId)
    }
    chronology.record(activity.id)
    return request.name
  }

  func update(byName name: String, request: VoltraDynamicLiveActivityUpdateRequest) async throws -> Bool {
    try VoltraDynamicLiveActivityPayloadValidator.validateContentState(request.props)
    return await VoltraDynamicLiveActivityRegistry.shared.update(byName: name, request: request)
  }

  func end(byName name: String, dismissalPolicy: ActivityUIDismissalPolicy) async -> Bool {
    await VoltraDynamicLiveActivityRegistry.shared.end(byName: name, dismissalPolicy: dismissalPolicy)
  }

  func endAll(dismissalPolicy: ActivityUIDismissalPolicy) async {
    await VoltraDynamicLiveActivityRegistry.shared.endAll(dismissalPolicy: dismissalPolicy)
  }

  func reload(definitionIds: [String]?) async {
    #if DEBUG
      let requested = definitionIds.map(Set.init)
      let ids = requested ?? Set(self.definitionIds())
      var refreshed = Set<String>()
      for definitionId in ids.sorted() {
        guard VoltraDynamicLiveActivityRegistry.shared.contains(definitionId) else { continue }
        do {
          let source = try await VoltraDynamicLiveActivityBundleSource.loadForApp(definitionId: definitionId)
          guard VoltraJSRenderer.evaluateLiveActivityBundle(source: source, definitionId: definitionId) else {
            throw VoltraDynamicLiveActivityError.resourceUnavailable(
              NSError(
                domain: "VoltraDynamicLiveActivity",
                code: -2,
                userInfo: [NSLocalizedDescriptionKey: "Dynamic Live Activity bundle could not be evaluated."]
              )
            )
          }
          refreshed.insert(definitionId)
        } catch {
          VoltraLogger.activity.error("Failed to refresh Dynamic Live Activity definition '\(definitionId)': \(error)")
        }
      }
      await VoltraDynamicLiveActivityRegistry.shared.reload(definitionIds: refreshed)
    #endif
  }
}
