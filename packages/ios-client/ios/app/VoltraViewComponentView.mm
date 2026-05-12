#import "VoltraViewComponentView.h"
#import <Voltra-Swift.h>

#import <react/renderer/components/VoltraSpec/ComponentDescriptors.h>
#import <react/renderer/components/VoltraSpec/Props.h>
#import <react/renderer/components/VoltraSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

@interface VoltraViewComponentView () <RCTVoltraViewViewProtocol>
@end

@implementation VoltraViewComponentView {
  VoltraViewRoot *_contentView;
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _contentView = [[VoltraViewRoot alloc] initWithFrame:CGRectZero];
    [self addSubview:_contentView];
  }
  return self;
}

- (instancetype)init {
  return [self initWithFrame:CGRectZero];
}

- (void)updateProps:(Props::Shared const &)props
           oldProps:(Props::Shared const &)oldProps {
  const auto &oldViewProps =
      *std::static_pointer_cast<const VoltraViewProps>(_props);
  const auto &newViewProps =
      *std::static_pointer_cast<const VoltraViewProps>(props);

  if (oldViewProps.viewId != newViewProps.viewId) {
    NSString *viewId =
        [[NSString alloc] initWithUTF8String:newViewProps.viewId.c_str()]
            ?: @"";
    [_contentView setViewId:viewId];
  }

  if (oldViewProps.payload != newViewProps.payload) {
    NSString *payload =
        [[NSString alloc] initWithUTF8String:newViewProps.payload.c_str()]
            ?: @"";
    [_contentView setPayload:payload];
  }

  [super updateProps:props oldProps:oldProps];
}

- (void)layoutSubviews {
  [super layoutSubviews];
  _contentView.frame = self.bounds;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<VoltraViewComponentDescriptor>();
}

@end
