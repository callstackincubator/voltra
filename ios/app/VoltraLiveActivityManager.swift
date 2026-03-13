import ActivityKit
import Foundation

//  The underlying ActivityKit APIs deliver updates via async for-await loops that
//  run on arbitrary tasks. Without synchronization, dictionaries and sets mutated
//  from those tasks are data races. Making this type an `actor` ensures every read
//  and write to its stored properties is serialized automatically by the Swift
//  concurrency runtime -- no locks required.

public actor VoltraLiveActivityManager {

  // MARK: - Callbacks

  // Callbacks are `let` + `@Sendable` so they are immutable after init and safe
  // to call from any concurrency context without capturing `self`.

  /// Called when a push token is received or rotated for a specific activity.
  /// Parameters: (activityName, hexToken)
  private let onTokenUpdated: (@Sendable (String, String) -> Void)?

  /// Called when the push-to-start token is received or rotated (iOS 17.2+).
  /// Parameter: hexToken
  private let onPushToStartUpdated: (@Sendable (String) -> Void)?

  /// Called when an activity transitions to a new lifecycle state.
  /// Parameters: (activityName, stateDescription)
  private let onStateChanged: (@Sendable (String, String) -> Void)?

  // MARK: - Internal Task State

  /// Drives the main `Activity.activityUpdates` loop. When this task is cancelled,
  /// the loop exits and no new per-activity observers are created.
  private var activityUpdatesTask: Task<Void, Never>?

  /// Drives the `Activity.pushToStartTokenUpdates` loop (iOS 17.2+ only).
  private var pushToStartTask: Task<Void, Never>?

  /// One push-token observer task per live activity, keyed by `activity.id`.
  /// Using a dictionary (rather than a flat array) lets us deduplicate and cancel
  /// individual tasks when an activity ends.
  private var tokenTasks: [String: Task<Void, Never>] = [:]

  /// One lifecycle-state observer task per live activity, keyed by `activity.id`.
  private var stateTasks: [String: Task<Void, Never>] = [:]

  /// The last push-to-start token we forwarded to the callback.
  /// ActivityKit re-delivers the current token whenever a live activity starts or
  /// ends (the push-to-start eligibility state has changed), even if the token
  /// itself hasn't rotated. We track the last value so we only forward genuine
  /// token changes and suppress duplicate deliveries.
  private var lastPushToStartToken: String?

  // MARK: - Init

  public init(
    onTokenUpdated: (@Sendable (String, String) -> Void)? = nil,
    onPushToStartUpdated: (@Sendable (String) -> Void)? = nil,
    onStateChanged: (@Sendable (String, String) -> Void)? = nil
  ) {
    self.onTokenUpdated = onTokenUpdated
    self.onPushToStartUpdated = onPushToStartUpdated
    self.onStateChanged = onStateChanged
  }

  // MARK: - Public API

  /// Begin observing all live activities and tokens.
  ///
  /// This method is idempotent: calling it while already observing is a no-op.
  /// To restart observation, call `stopObserving()` first.
  public func startObserving() {
    guard activityUpdatesTask == nil else { return }

    startActivityUpdatesObservation()
    startPushToStartObservation()
  }

  /// Stop all observation and cancel every outstanding task.
  ///
  /// Safe to call from any context. After this returns the actor holds no running
  /// tasks; calling `startObserving()` again creates a fresh set.
  public func stopObserving() {
    activityUpdatesTask?.cancel()
    activityUpdatesTask = nil

    pushToStartTask?.cancel()
    pushToStartTask = nil

    lastPushToStartToken = nil

    cancelAllPerActivityTasks()
  }

  // MARK: - deinit

  // Safety net: if the manager is deallocated without stopObserving() being called
  // (e.g. during app shutdown), cancel every task so no coroutine keeps running as
  // an orphan. SE-0371 (Swift 5.9) allows actors to access their stored properties
  // in deinit because no other reference can exist at that point.
  deinit {
    activityUpdatesTask?.cancel()
    pushToStartTask?.cancel()
    for task in tokenTasks.values { task.cancel() }
    for task in stateTasks.values { task.cancel() }
  }

  // MARK: - Activity Updates Loop

  private func startActivityUpdatesObservation() {
    activityUpdatesTask = Task { [weak self] in
      // Observe activities that were already running when we started --
      // `Activity.activityUpdates` only yields *newly created* activities,
      // so we must handle pre-existing ones explicitly.
      for activity in Activity<VoltraAttributes>.activities {
        await self?.observe(activity)
      }

      // Then listen for any activities created from this point onward.
      for await activity in Activity<VoltraAttributes>.activityUpdates {
        await self?.observe(activity)
      }
    }
  }

  // MARK: - Push-to-Start Token Loop (iOS 17.2+)

  private func startPushToStartObservation() {
    guard #available(iOS 17.2, *), let onPushToStartUpdated else { return }

    // Read the token that may already be available before the async stream fires.
    if let existingTokenData = Activity<VoltraAttributes>.pushToStartToken {
      deliverPushToStartToken(existingTokenData.hexString, via: onPushToStartUpdated)
    }

    // Capture the callback locally so the task does not need to hop back to the
    // actor on every token delivery -- callbacks are @Sendable and safe to call
    // from any context.
    let callback = onPushToStartUpdated

    pushToStartTask = Task { [weak self] in
      for await tokenData in Activity<VoltraAttributes>.pushToStartTokenUpdates {
        await self?.deliverPushToStartToken(tokenData.hexString, via: callback)
      }
    }
  }

  /// Forward `token` to `callback` only if it differs from the last token we sent.
  /// ActivityKit re-delivers the same token when a live activity starts or ends,
  /// so this guard prevents spurious duplicate events on the JS side.
  private func deliverPushToStartToken(
    _ token: String,
    via callback: @Sendable (String) -> Void
  ) {
    guard token != lastPushToStartToken else { return }
    lastPushToStartToken = token
    callback(token)
  }

  // MARK: - Per-Activity Observation

  /// Start observing a single activity's push token and state changes.
  ///
  /// Deduplication: if we are already watching this activity (same `id`), this
  /// is a no-op. `activityUpdates` can re-yield the same activity after updates,
  /// so deduplication here prevents duplicate concurrent observers.
  private func observe(_ activity: Activity<VoltraAttributes>) {
    let activityId = activity.id
    let activityName = activity.attributes.name

    // Token observation
    if let onTokenUpdated, tokenTasks[activityId] == nil {
      // Capture the callback locally to avoid an actor hop on every token delivery.
      let callback = onTokenUpdated

      let tokenTask = Task { [weak self] in
        for await tokenData in activity.pushTokenUpdates {
          callback(activityName, tokenData.hexString)
        }
        // The async sequence ends when the activity is dismissed or ended.
        // Clean up our entry so we don't hold a reference to the finished task.
        await self?.removeTokenTask(for: activityId)
      }

      tokenTasks[activityId] = tokenTask
    }

    // State observation
    if let onStateChanged, stateTasks[activityId] == nil {
      let callback = onStateChanged

      let stateTask = Task { [weak self] in
        for await state in activity.activityStateUpdates {
          callback(activityName, String(describing: state))
        }
        await self?.removeStateTask(for: activityId)
      }

      stateTasks[activityId] = stateTask
    }
  }

  // MARK: - Task Cleanup Helpers

  private func removeTokenTask(for activityId: String) {
    tokenTasks[activityId]?.cancel()
    tokenTasks.removeValue(forKey: activityId)
  }

  private func removeStateTask(for activityId: String) {
    stateTasks[activityId]?.cancel()
    stateTasks.removeValue(forKey: activityId)
  }

  private func cancelAllPerActivityTasks() {
    for task in tokenTasks.values { task.cancel() }
    tokenTasks.removeAll()

    for task in stateTasks.values { task.cancel() }
    stateTasks.removeAll()
  }
}
