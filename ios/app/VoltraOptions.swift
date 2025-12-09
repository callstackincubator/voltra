import ExpoModulesCore
import Foundation

/// Shared options for both startVoltra and updateVoltra
public struct SharedVoltraOptions: Record {
  /// Unix timestamp in milliseconds
  @Field
  public var staleDate: Double?

  /// Double value between 0.0 and 1.0, defaults to 0.0
  @Field
  public var relevanceScore: Double?

  /// How the Live Activity should be dismissed after ending
  @Field
  public var dismissalPolicy: DismissalPolicyOptions?

  public init() {}
}

/// Options for starting a Live Activity
public struct StartVoltraOptions: Record {
  /// The unique identifier of the Live Activity.
  /// Allows you to rebind to the same activity on app restart.
  @Field
  public var activityId: String?
  
  /// URL to open when the Live Activity is tapped.
  @Field
  public var deepLinkUrl: String?
  
  /// Unix timestamp in milliseconds
  @Field
  public var staleDate: Double?
  
  /// Double value between 0.0 and 1.0, defaults to 0.0
  @Field
  public var relevanceScore: Double?
  
  /// Internal: Target type ("liveActivity" or "widget")
  @Field
  public var target: String?
  
  /// Internal: Widget key for static widgets
  @Field
  public var widgetKey: String?
  
  /// Internal: Auto-end timestamp in milliseconds
  @Field
  public var autoEndAt: Double?
  
  public init() {}
}

/// Options for updating a Live Activity
public typealias UpdateVoltraOptions = SharedVoltraOptions

/// Options for ending a Live Activity
public struct EndVoltraOptions: Record {
  @Field
  public var dismissalPolicy: DismissalPolicyOptions?

  public init() {}
}

/// Dismissal policy options
public struct DismissalPolicyOptions: Record {
  @Field
  public var type: String  // "immediate" or "after"

  @Field
  public var date: Double? // timestamp for after

  public init() {}
}

