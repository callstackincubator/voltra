import ActivityKit
import Foundation

/// Type-erased operations for one generated ActivityKit attributes type.
///
/// Generated source registers descriptors at runtime. Pod-owned code only
/// depends on this registry and never names a type compiled into the host app.
private struct VoltraDynamicLiveActivityDescriptor {
  let definitionId: String
  let create: (VoltraDynamicLiveActivityCreateRequest) async throws -> VoltraDynamicLiveActivityReference
  let update: (String, VoltraDynamicLiveActivityUpdateRequest) async -> Bool
  let end: (String, ActivityUIDismissalPolicy) async -> Bool
  let endAll: (ActivityUIDismissalPolicy) async -> Void
  let activities: () -> [VoltraDynamicLiveActivityReference]
  let observe: (VoltraDynamicLiveActivityObserver) async -> Void
  let reload: () async -> Void

  init<Attributes: VoltraDynamicLiveActivityDefinition>(_ attributes: Attributes.Type) {
    definitionId = Attributes.definitionId
    create = { try await VoltraDynamicLiveActivityOperations.create(attributes, request: $0) }
    update = { await VoltraDynamicLiveActivityOperations.update(attributes, byName: $0, request: $1) }
    end = { await VoltraDynamicLiveActivityOperations.end(attributes, byName: $0, dismissalPolicy: $1) }
    endAll = { await VoltraDynamicLiveActivityOperations.endAll(attributes, dismissalPolicy: $0) }
    activities = { VoltraDynamicLiveActivityOperations.activities(attributes) }
    observe = { await $0.observe(attributes) }
    reload = { await VoltraDynamicLiveActivityOperations.reload(attributes) }
  }
}

/// Runtime-owned catalog populated by the generated host source.
///
/// `VoltraGeneratedDynamicLiveActivityRegistration` has a fixed Objective-C
/// runtime name in both the app and extension products. This lets the pod ask
/// the host target to register its generated types without creating a reverse
/// compile-time dependency from the pod to the host.
public final class VoltraDynamicLiveActivityRegistry {
  public static let shared = VoltraDynamicLiveActivityRegistry()

  private let lock = NSLock()
  private var descriptors: [String: VoltraDynamicLiveActivityDescriptor] = [:]
  private var attemptedGeneratedRegistration = false

  private init() {}

  public func register<Attributes: VoltraDynamicLiveActivityDefinition>(_ attributes: Attributes.Type) {
    lock.lock()
    descriptors[Attributes.definitionId] = VoltraDynamicLiveActivityDescriptor(attributes)
    lock.unlock()
  }

  public func contains(_ definitionId: String) -> Bool {
    ensureGeneratedRegistration()
    lock.lock()
    defer { lock.unlock() }
    return descriptors[definitionId] != nil
  }

  public func definitionIds() -> [String] {
    ensureGeneratedRegistration()
    lock.lock()
    defer { lock.unlock() }
    return descriptors.keys.sorted()
  }

  public func create(_ request: VoltraDynamicLiveActivityCreateRequest) async throws -> VoltraDynamicLiveActivityReference? {
    guard let descriptor = descriptor(for: request.definitionId) else { return nil }
    return try await descriptor.create(request)
  }

  public func update(byName name: String, request: VoltraDynamicLiveActivityUpdateRequest) async -> Bool {
    for descriptor in descriptorSnapshot() {
      if await descriptor.update(name, request) {
        return true
      }
    }
    return false
  }

  public func end(byName name: String, dismissalPolicy: ActivityUIDismissalPolicy) async -> Bool {
    var ended = false
    for descriptor in descriptorSnapshot() {
      if await descriptor.end(name, dismissalPolicy) {
        ended = true
      }
    }
    return ended
  }

  public func endAll(dismissalPolicy: ActivityUIDismissalPolicy) async {
    for descriptor in descriptorSnapshot() {
      await descriptor.endAll(dismissalPolicy)
    }
  }

  public func activities() -> [VoltraDynamicLiveActivityReference] {
    descriptorSnapshot().flatMap { $0.activities() }
  }

  public func startObserving(with observer: VoltraDynamicLiveActivityObserver) async {
    for descriptor in descriptorSnapshot() {
      await descriptor.observe(observer)
    }
  }

  public func reload(definitionIds: Set<String>?) async {
    for descriptor in descriptorSnapshot() where definitionIds?.contains(descriptor.definitionId) != false {
      await descriptor.reload()
    }
  }

  private func descriptor(for definitionId: String) -> VoltraDynamicLiveActivityDescriptor? {
    ensureGeneratedRegistration()
    lock.lock()
    defer { lock.unlock() }
    return descriptors[definitionId]
  }

  private func descriptorSnapshot() -> [VoltraDynamicLiveActivityDescriptor] {
    ensureGeneratedRegistration()
    lock.lock()
    defer { lock.unlock() }
    return descriptors.values.sorted { $0.definitionId < $1.definitionId }
  }

  private func ensureGeneratedRegistration() {
    lock.lock()
    guard !attemptedGeneratedRegistration else {
      lock.unlock()
      return
    }
    attemptedGeneratedRegistration = true
    lock.unlock()

    let className = "VoltraGeneratedDynamicLiveActivityRegistration"
    let selector = NSSelectorFromString("registerDefinitions")
    guard let registration = NSClassFromString(className) as? NSObject.Type,
          registration.responds(to: selector)
    else {
      return
    }
    registration.perform(selector)
  }
}
