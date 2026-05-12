import Foundation

@objc public final class StartVoltraOptions: NSObject {
  @objc public var activityName: String?
  @objc public var deepLinkUrl: String?
  @objc public var staleDate: NSNumber?
  @objc public var relevanceScore: NSNumber?
  @objc public var channelId: String?
}

@objc public final class UpdateVoltraOptions: NSObject {
  @objc public var staleDate: NSNumber?
  @objc public var relevanceScore: NSNumber?
}

@objc public final class DismissalPolicyOptions: NSObject {
  @objc public var type: String = "immediate"
  @objc public var date: NSNumber?
}

@objc public final class EndVoltraOptions: NSObject {
  @objc public var dismissalPolicy: DismissalPolicyOptions?
}

@objc public final class UpdateWidgetOptions: NSObject {
  @objc public var deepLinkUrl: String?
}
