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

/// Options for preloading a single image
public struct PreloadImageOptions: Record {
  /// The URL to download the image from
  @Field
  public var url: String
  
  /// The key to use when referencing this image (used as assetName)
  @Field
  public var key: String
  
  /// HTTP method to use (GET, POST, PUT). Defaults to GET.
  @Field
  public var method: String?
  
  /// Optional HTTP headers to include in the request
  @Field
  public var headers: [String: String]?
  
  public init() {}
}

/// Result of a failed image preload
public struct PreloadImageFailure: Record {
  @Field
  public var key: String
  
  @Field
  public var error: String
  
  public init() {}
  
  public init(key: String, error: String) {
    self.key = key
    self.error = error
  }
}

/// Result of preloading images
public struct PreloadImagesResult: Record {
  @Field
  public var succeeded: [String]
  
  @Field
  public var failed: [PreloadImageFailure]
  
  public init() {}
  
  public init(succeeded: [String], failed: [PreloadImageFailure]) {
    self.succeeded = succeeded
    self.failed = failed
  }
}

