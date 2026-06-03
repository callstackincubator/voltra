#import "NativeVoltra.h"

#if __has_include("Voltra/Voltra-Swift.h")
#import "Voltra/Voltra-Swift.h"
#else
#import "Voltra-Swift.h"
#endif

@interface NativeVoltra () {
  VoltraModule *_module;
}
@end

@implementation NativeVoltra

- (void)setEventEmitterCallback:(EventEmitterCallbackWrapper *_Nonnull)eventEmitterCallbackWrapper
{
  [super setEventEmitterCallback:eventEmitterCallbackWrapper];

  [self.module startMonitoringWithEventHandler:^(NSString *eventName, NSDictionary *eventData) {
    if ([eventName isEqualToString:@"interaction"]) {
      [self emitOnInteraction:eventData];
    } else if ([eventName isEqualToString:@"stateChange"]) {
      [self emitOnStateChanged:eventData];
    } else if ([eventName isEqualToString:@"activityTokenReceived"]) {
      [self emitOnActivityTokenReceived:eventData];
    } else if ([eventName isEqualToString:@"activityPushToStartTokenReceived"]) {
      [self emitOnActivityPushToStartTokenReceived:eventData];
    }
  }];
}

- (VoltraModule *)module
{
  if (!_module) {
    _module = [VoltraModule new];
  }
  return _module;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeVoltraSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"NativeVoltra";
}

#pragma mark - NativeVoltraSpec

- (void)startLiveActivity:(NSString *)jsonString
                  options:(JS::NativeVoltra::StartVoltraOptions &)options
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject
{
  StartVoltraOptions *opts = [StartVoltraOptions new];
  opts.activityName = options.activityName();
  opts.deepLinkUrl = options.deepLinkUrl();
  opts.channelId = options.channelId();
  if (auto v = options.staleDate()) opts.staleDate = @(v.value());
  if (auto v = options.relevanceScore()) opts.relevanceScore = @(v.value());
  [self.module startLiveActivity:jsonString options:opts completion:^(NSString *activityId, NSError *error) {
    if (error) { reject(@"startLiveActivity", error.localizedDescription, error); } else { resolve(activityId); }
  }];
}

- (void)updateLiveActivity:(NSString *)activityId
                jsonString:(NSString *)jsonString
                   options:(JS::NativeVoltra::UpdateVoltraOptions &)options
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject
{
  UpdateVoltraOptions *opts = [UpdateVoltraOptions new];
  if (auto v = options.staleDate()) opts.staleDate = @(v.value());
  if (auto v = options.relevanceScore()) opts.relevanceScore = @(v.value());
  [self.module updateLiveActivity:activityId jsonString:jsonString options:opts completion:^(NSError *error) {
    if (error) { reject(@"updateLiveActivity", error.localizedDescription, error); } else { resolve(nil); }
  }];
}

- (void)endLiveActivity:(NSString *)activityId
                options:(JS::NativeVoltra::EndVoltraOptions &)options
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject
{
  EndVoltraOptions *opts = [EndVoltraOptions new];
  if (auto dismissal = options.dismissalPolicy()) {
    DismissalPolicyOptions *policy = [DismissalPolicyOptions new];
    policy.type = dismissal->type();
    if (auto date = dismissal->date()) policy.date = @(date.value());
    opts.dismissalPolicy = policy;
  }
  [self.module endLiveActivity:activityId options:opts completion:^(NSError *error) {
    if (error) { reject(@"endLiveActivity", error.localizedDescription, error); } else { resolve(nil); }
  }];
}

- (void)endAllLiveActivities:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [self.module endAllLiveActivities:^(NSError *error) {
    if (error) { reject(@"endAllLiveActivities", error.localizedDescription, error); } else { resolve(nil); }
  }];
}

- (void)getLatestVoltraActivityId:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  resolve([self.module getLatestVoltraActivityId]);
}

- (void)listVoltraActivityIds:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  resolve([self.module listVoltraActivityIds]);
}

- (NSNumber *)isLiveActivityActive:(NSString *)activityName
{
  return @([self.module isLiveActivityActive:activityName]);
}

- (NSNumber *)isHeadless
{
  return @([self.module isHeadless]);
}

- (void)preloadImages:(NSArray *)images resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [self.module preloadImages:images completion:^(NSDictionary *result, NSError *error) {
    if (error) { reject(@"preloadImages", error.localizedDescription, error); } else { resolve(result); }
  }];
}

- (void)reloadLiveActivities:(NSArray *)activityNames resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [self.module reloadLiveActivities:activityNames completion:^(NSError *error) {
    if (error) { reject(@"reloadLiveActivities", error.localizedDescription, error); } else { resolve(nil); }
  }];
}

- (void)clearPreloadedImages:(NSArray *)keys resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [self.module clearPreloadedImages:keys completion:^{ resolve(nil); }];
}

- (void)updateWidget:(NSString *)widgetId
          jsonString:(NSString *)jsonString
             options:(JS::NativeVoltra::UpdateWidgetOptions &)options
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject
{
  UpdateWidgetOptions *opts = [UpdateWidgetOptions new];
  opts.deepLinkUrl = options.deepLinkUrl();
  [self.module updateWidget:widgetId jsonString:jsonString options:opts completion:^(NSError *error) {
    if (error) { reject(@"updateWidget", error.localizedDescription, error); } else { resolve(nil); }
  }];
}

- (void)scheduleWidget:(NSString *)widgetId
          timelineJson:(NSString *)timelineJson
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject
{
  [self.module scheduleWidget:widgetId timelineJson:timelineJson completion:^(NSError *error) {
    if (error) { reject(@"scheduleWidget", error.localizedDescription, error); } else { resolve(nil); }
  }];
}

- (void)reloadWidgets:(NSArray *)widgetIds resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [self.module reloadWidgets:widgetIds completion:^{ resolve(nil); }];
}

- (void)clearWidget:(NSString *)widgetId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [self.module clearWidget:widgetId completion:^{ resolve(nil); }];
}

- (void)clearAllWidgets:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [self.module clearAllWidgets:^{ resolve(nil); }];
}

- (void)getActiveWidgets:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [self.module getActiveWidgets:^(NSArray *result, NSError *error) {
    if (error) { reject(@"getActiveWidgets", error.localizedDescription, error); } else { resolve(result); }
  }];
}

- (void)setWidgetServerCredentials:(JS::NativeVoltra::WidgetServerCredentials &)credentials
                           resolve:(RCTPromiseResolveBlock)resolve
                            reject:(RCTPromiseRejectBlock)reject
{
  [self.module setWidgetServerCredentials:credentials.token() headers:(NSDictionary *)credentials.headers()];
  resolve(nil);
}

- (void)clearWidgetServerCredentials:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [self.module clearWidgetServerCredentials];
  resolve(nil);
}

#pragma mark - Track 5 / Phase 3a — client-rendered widget runtime smoke test

- (void)voltraWidgetEvalBundle:(NSString *)widgetId
                  bundleSource:(NSString *)bundleSource
                       resolve:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject
{
  [self.module voltraWidgetEvalBundle:widgetId
                         bundleSource:bundleSource
                           completion:^(NSError *error) {
    if (error) {
      reject(@"voltraWidgetEvalBundle", error.localizedDescription, error);
    } else {
      resolve(nil);
    }
  }];
}

- (void)voltraWidgetRender:(NSString *)widgetId
                 propsJSON:(NSString *)propsJSON
                   envJSON:(NSString *)envJSON
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject
{
  [self.module voltraWidgetRender:widgetId
                        propsJSON:propsJSON
                          envJSON:envJSON
                       completion:^(NSString *result, NSError *error) {
    if (error) {
      reject(@"voltraWidgetRender", error.localizedDescription, error);
    } else {
      resolve(result ?: @"");
    }
  }];
}

- (void)dealloc
{
  [self.module stopMonitoring];
}

@end
