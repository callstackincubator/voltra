import ActivityKit
import Foundation

/// Observes every concrete generated Dynamic Live Activity type. ActivityKit's
/// activity streams are type-specific, so the generated catalog invokes this
/// observer once for each bundled attributes type.
public actor VoltraDynamicLiveActivityObserver {
  private let onActivityDiscovered: (@Sendable (String) -> Void)?
  private let onTokenUpdated: (@Sendable (String, String) -> Void)?
  private let onStateChanged: (@Sendable (String, String) -> Void)?

  private var definitionTasks: [String: Task<Void, Never>] = [:]
  private var tokenTasks: [String: Task<Void, Never>] = [:]
  private var stateTasks: [String: Task<Void, Never>] = [:]

  public init(
    onActivityDiscovered: (@Sendable (String) -> Void)? = nil,
    onTokenUpdated: (@Sendable (String, String) -> Void)? = nil,
    onStateChanged: (@Sendable (String, String) -> Void)? = nil
  ) {
    self.onActivityDiscovered = onActivityDiscovered
    self.onTokenUpdated = onTokenUpdated
    self.onStateChanged = onStateChanged
  }

  public func observe<Attributes: VoltraDynamicLiveActivityDefinition>(_: Attributes.Type) {
    let definitionId = Attributes.definitionId
    guard definitionTasks[definitionId] == nil else { return }

    definitionTasks[definitionId] = Task { [weak self] in
      for activity in Activity<Attributes>.activities {
        await self?.observe(activity, definitionId: definitionId)
      }
      for await activity in Activity<Attributes>.activityUpdates {
        await self?.observe(activity, definitionId: definitionId)
      }
      await self?.removeDefinitionTask(for: definitionId)
    }
  }

  public func stopObserving() {
    for task in definitionTasks.values {
      task.cancel()
    }
    for task in tokenTasks.values {
      task.cancel()
    }
    for task in stateTasks.values {
      task.cancel()
    }
    definitionTasks.removeAll()
    tokenTasks.removeAll()
    stateTasks.removeAll()
  }

  private func observe<Attributes: VoltraDynamicLiveActivityDefinition>(
    _ activity: Activity<Attributes>,
    definitionId: String
  ) {
    let key = "\(definitionId):\(activity.id)"
    let name = activity.attributes.name
    onActivityDiscovered?(activity.id)

    if let onTokenUpdated, tokenTasks[key] == nil {
      tokenTasks[key] = Task { [weak self] in
        for await token in activity.pushTokenUpdates {
          onTokenUpdated(name, token.hexString)
        }
        await self?.removeTokenTask(for: key)
      }
    }

    if let onStateChanged, stateTasks[key] == nil {
      stateTasks[key] = Task { [weak self] in
        for await state in activity.activityStateUpdates {
          onStateChanged(name, String(describing: state))
        }
        await self?.removeStateTask(for: key)
      }
    }
  }

  private func removeDefinitionTask(for definitionId: String) {
    definitionTasks[definitionId]?.cancel()
    definitionTasks.removeValue(forKey: definitionId)
  }

  private func removeTokenTask(for key: String) {
    tokenTasks[key]?.cancel()
    tokenTasks.removeValue(forKey: key)
  }

  private func removeStateTask(for key: String) {
    stateTasks[key]?.cancel()
    stateTasks.removeValue(forKey: key)
  }
}
