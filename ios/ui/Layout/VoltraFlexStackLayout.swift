import SwiftUI

// MARK: - Voltra Flex Stack Layout

/// SwiftUI Layout implementing RN-like flexbox for a single axis
struct VoltraFlexStackLayout: Layout {
  let axis: Axis // .vertical or .horizontal
  let spacing: CGFloat
  let alignItems: FlexAlign // Default: .stretch
  let justifyContent: FlexJustify // Default: .flexStart
  let containerPadding: EdgeInsets // From container's style

  // MARK: - sizeThatFits

  func sizeThatFits(
    proposal: ProposedViewSize,
    subviews: Subviews,
    cache _: inout ()
  ) -> CGSize {
    let available = availableSize(from: proposal)
    let resolved = resolveChildren(subviews: subviews, available: available)
    let totalMain = resolved.reduce(0) { $0 + $1.mainSize + $1.mainMargin }
      + spacing * CGFloat(max(0, subviews.count - 1))
    let maxCross = resolved.reduce(0) { max($0, $1.crossSize + $1.crossMargin) }

    let mainSize = main(from: proposal) ?? (totalMain + mainPadding)
    let crossSize = cross(from: proposal) ?? (maxCross + crossPadding)

    return size(main: mainSize, cross: crossSize)
  }

  // MARK: - placeSubviews

  func placeSubviews(
    in bounds: CGRect,
    proposal _: ProposedViewSize,
    subviews: Subviews,
    cache _: inout ()
  ) {
    let available = CGSize(
      width: bounds.width - leadingPad - trailingPad,
      height: bounds.height - topPad - bottomPad
    )
    let resolved = resolveChildren(subviews: subviews, available: available)

    // Compute main-axis positions based on justifyContent
    let totalChildrenAndMargins = resolved.reduce(CGFloat(0)) { $0 + $1.mainSize + $1.mainMargin }
    let baseSpacing = spacing * CGFloat(max(0, subviews.count - 1))
    let usesJustifySpacing = justifyContent == .spaceBetween || justifyContent == .spaceAround || justifyContent == .spaceEvenly
    // For spacing-based justify modes, remaining space includes base spacing (justify replaces it)
    let totalMain = totalChildrenAndMargins + (usesJustifySpacing ? 0 : baseSpacing)
    let remainingMain = mainAxis(available) - totalMain
    let (startOffset, gapSpacing) = justifyOffsets(
      remaining: remainingMain, count: subviews.count
    )
    // For spacing-based justify, gapSpacing replaces base spacing; otherwise add extraSpacing (0) to base
    let effectiveSpacing = usesJustifySpacing ? gapSpacing : (spacing + gapSpacing)

    var mainCursor = mainStart(bounds) + startOffset

    for (index, subview) in subviews.enumerated() {
      let child = resolved[index]

      // Main-axis: advance by leading margin
      mainCursor += child.mainMarginLeading

      // Cross-axis: align based on alignItems / alignSelf
      let crossPos = crossPosition(
        child: child,
        availableCross: crossAxis(available),
        boundsOrigin: crossStart(bounds)
      )

      let point = position(main: mainCursor, cross: crossPos)
      let childProposal = ProposedViewSize(
        width: axis == .horizontal ? child.mainSize : child.crossSize,
        height: axis == .vertical ? child.mainSize : child.crossSize
      )
      subview.place(at: point, anchor: .topLeading, proposal: childProposal)

      mainCursor += child.mainSize + child.mainMarginTrailing + effectiveSpacing
    }
  }

  // MARK: - Child Resolution

  private struct ResolvedChild {
    let mainSize: CGFloat
    let crossSize: CGFloat
    let mainMarginLeading: CGFloat
    let mainMarginTrailing: CGFloat
    let crossMarginLeading: CGFloat
    let crossMarginTrailing: CGFloat
    var mainMargin: CGFloat { mainMarginLeading + mainMarginTrailing }
    var crossMargin: CGFloat { crossMarginLeading + crossMarginTrailing }
    let alignSelf: FlexAlign?
  }

  private func resolveChildren(
    subviews: Subviews,
    available: CGSize
  ) -> [ResolvedChild] {
    let availableMain = mainAxis(available)
    let availableCross = crossAxis(available)

    // Step 1: Compute base sizes
    var items: [(index: Int, baseMain: CGFloat, flexGrow: CGFloat, flexShrink: CGFloat,
                 minMain: CGFloat?, maxMain: CGFloat?, crossSize: CGFloat,
                 margin: EdgeInsets?, alignSelf: FlexAlign?)] = []

    for (i, subview) in subviews.enumerated() {
      let values = subview[FlexItemLayoutKey.self]
      let margin = values.margin ?? EdgeInsets()

      // Determine main-axis basis
      let mainBasis: CGFloat
      if let basis = values.flexBasis {
        switch basis {
        case let .fixed(v): mainBasis = v
        case .fill: mainBasis = availableMain.isFinite ? availableMain : measureIntrinsicMain(subview, availableCross: availableCross, values: values)
        case .wrap: mainBasis = measureIntrinsicMain(subview, availableCross: availableCross, values: values)
        }
      } else {
        // flexBasis: auto → use width/height if set, else intrinsic
        mainBasis = resolveAutoMainBasis(subview, values: values, availableMain: availableMain, availableCross: availableCross)
      }

      // Determine cross-axis size
      // Only stretch to a finite available cross; infinite means intrinsic measurement
      let effectiveAlign = values.alignSelf ?? alignItems
      let crossProposal: CGFloat? = (effectiveAlign == .stretch && availableCross.isFinite) ? availableCross : nil
      let crossSize = resolveCrossSize(subview, values: values, proposal: crossProposal, availableCross: availableCross)

      // Min/max on main axis
      let (minMain, maxMain) = mainMinMax(values)

      let clampedBase = clamp(mainBasis, min: minMain, max: maxMain)

      items.append((i, clampedBase, values.flexGrow, values.flexShrink,
                    minMain, maxMain, crossSize, values.margin, values.alignSelf))
    }

    // Step 2: Compute total base + margins + spacing
    let totalMargins = items.reduce(CGFloat(0)) { total, item in
      total + mainMarginSum(item.margin ?? EdgeInsets())
    }
    let totalSpacing = spacing * CGFloat(max(0, items.count - 1))
    let totalBase = items.reduce(CGFloat(0)) { $0 + $1.baseMain }
    let usedSpace = totalBase + totalMargins + totalSpacing
    let freeSpace = availableMain - usedSpace

    // Step 3: Distribute free space
    var finalMainSizes = items.map(\.baseMain)

    if freeSpace > 0 {
      // Grow
      let totalGrow = items.reduce(CGFloat(0)) { $0 + $1.flexGrow }
      if totalGrow > 0 {
        for (j, item) in items.enumerated() {
          if item.flexGrow > 0 {
            let share = freeSpace * (item.flexGrow / totalGrow)
            finalMainSizes[j] = clamp(item.baseMain + share, min: item.minMain, max: item.maxMain)
          }
        }
      }
    } else if freeSpace < 0 {
      // Shrink
      let totalShrink = items.reduce(CGFloat(0)) { $0 + $1.flexShrink }
      if totalShrink > 0 {
        let deficit = -freeSpace
        for (j, item) in items.enumerated() {
          if item.flexShrink > 0 {
            let share = deficit * (item.flexShrink / totalShrink)
            finalMainSizes[j] = clamp(item.baseMain - share, min: item.minMain, max: item.maxMain)
          }
        }
      }
    }

    // Step 4: Build resolved children
    return items.enumerated().map { j, item in
      let m = item.margin ?? EdgeInsets()
      return ResolvedChild(
        mainSize: max(0, finalMainSizes[j]),
        crossSize: item.crossSize,
        mainMarginLeading: mainLeadingMargin(m),
        mainMarginTrailing: mainTrailingMargin(m),
        crossMarginLeading: crossLeadingMargin(m),
        crossMarginTrailing: crossTrailingMargin(m),
        alignSelf: item.alignSelf
      )
    }
  }

  // MARK: - Measurement Helpers

  /// Measure child's intrinsic main-axis size (flexBasis: auto, no explicit size)
  private func measureIntrinsicMain(
    _ subview: LayoutSubview,
    availableCross: CGFloat,
    values _: FlexItemValues
  ) -> CGFloat {
    let proposal: ProposedViewSize
    if axis == .horizontal {
      proposal = ProposedViewSize(width: nil, height: availableCross)
    } else {
      proposal = ProposedViewSize(width: availableCross, height: nil)
    }
    let size = subview.sizeThatFits(proposal)
    return mainAxis(size)
  }

  /// Resolve auto basis: use explicit width/height if set, else intrinsic
  private func resolveAutoMainBasis(
    _ subview: LayoutSubview,
    values: FlexItemValues,
    availableMain: CGFloat,
    availableCross: CGFloat
  ) -> CGFloat {
    let explicitMain = axis == .horizontal ? values.width : values.height
    if let explicit = explicitMain {
      switch explicit {
      case let .fixed(v): return v
      case .fill: return availableMain.isFinite ? availableMain : measureIntrinsicMain(subview, availableCross: availableCross, values: values)
      case .wrap: break
      }
    }
    return measureIntrinsicMain(subview, availableCross: availableCross, values: values)
  }

  /// Resolve cross-axis size
  private func resolveCrossSize(
    _ subview: LayoutSubview,
    values: FlexItemValues,
    proposal: CGFloat?,
    availableCross: CGFloat
  ) -> CGFloat {
    let explicitCross = axis == .horizontal ? values.height : values.width
    if let explicit = explicitCross {
      switch explicit {
      case let .fixed(v): return v
      case .fill: return availableCross.isFinite ? availableCross : crossAxis(subview.sizeThatFits(ProposedViewSize(width: nil, height: nil)))
      case .wrap: break
      }
    }
    // If stretch and no explicit cross size, use full cross axis (only finite values)
    if let proposal = proposal, proposal.isFinite { return proposal }
    // Otherwise, measure intrinsic
    let size = subview.sizeThatFits(ProposedViewSize(width: nil, height: nil))
    return crossAxis(size)
  }

  private func mainMinMax(_ values: FlexItemValues) -> (CGFloat?, CGFloat?) {
    if axis == .horizontal {
      return (values.minWidth, values.maxWidth)
    } else {
      return (values.minHeight, values.maxHeight)
    }
  }

  private func clamp(_ value: CGFloat, min: CGFloat?, max: CGFloat?) -> CGFloat {
    var result = value
    if let min = min { result = Swift.max(result, min) }
    if let max = max { result = Swift.min(result, max) }
    return result
  }

  // MARK: - Justify Content

  private func justifyOffsets(remaining: CGFloat, count: Int) -> (start: CGFloat, extraSpacing: CGFloat) {
    guard count > 0 else { return (0, 0) }
    switch justifyContent {
    case .flexStart: return (0, 0)
    case .flexEnd: return (max(0, remaining), 0)
    case .center: return (max(0, remaining / 2), 0)
    case .spaceBetween:
      guard count > 1 else { return (0, 0) }
      return (0, max(0, remaining / CGFloat(count - 1)))
    case .spaceAround:
      let gap = remaining / CGFloat(count)
      return (max(0, gap / 2), max(0, gap))
    case .spaceEvenly:
      let gap = remaining / CGFloat(count + 1)
      return (max(0, gap), max(0, gap))
    }
  }

  // MARK: - Cross-Axis Positioning

  private func crossPosition(
    child: ResolvedChild,
    availableCross: CGFloat,
    boundsOrigin: CGFloat
  ) -> CGFloat {
    let effectiveAlign = child.alignSelf ?? alignItems
    let childCrossWithMargin = child.crossSize + child.crossMargin
    let remaining = availableCross - childCrossWithMargin

    let alignedPos: CGFloat
    switch effectiveAlign {
    case .flexStart:
      alignedPos = 0
    case .flexEnd:
      alignedPos = max(0, remaining)
    case .center:
      alignedPos = max(0, remaining / 2)
    case .stretch:
      alignedPos = 0 // stretch already applied in size
    }

    return boundsOrigin + alignedPos + child.crossMarginLeading + crossPaddingLeading
  }

  // MARK: - Axis Helpers

  private var mainPadding: CGFloat {
    axis == .horizontal
      ? containerPadding.leading + containerPadding.trailing
      : containerPadding.top + containerPadding.bottom
  }

  private var crossPadding: CGFloat {
    axis == .horizontal
      ? containerPadding.top + containerPadding.bottom
      : containerPadding.leading + containerPadding.trailing
  }

  private var leadingPad: CGFloat { containerPadding.leading }
  private var trailingPad: CGFloat { containerPadding.trailing }
  private var topPad: CGFloat { containerPadding.top }
  private var bottomPad: CGFloat { containerPadding.bottom }

  private var crossPaddingLeading: CGFloat {
    axis == .horizontal ? containerPadding.top : containerPadding.leading
  }

  private func mainAxis(_ size: CGSize) -> CGFloat {
    axis == .horizontal ? size.width : size.height
  }

  private func crossAxis(_ size: CGSize) -> CGFloat {
    axis == .horizontal ? size.height : size.width
  }

  private func main(from proposal: ProposedViewSize) -> CGFloat? {
    axis == .horizontal ? proposal.width : proposal.height
  }

  private func cross(from proposal: ProposedViewSize) -> CGFloat? {
    axis == .horizontal ? proposal.height : proposal.width
  }

  private func size(main: CGFloat, cross: CGFloat) -> CGSize {
    axis == .horizontal ? CGSize(width: main, height: cross) : CGSize(width: cross, height: main)
  }

  private func position(main: CGFloat, cross: CGFloat) -> CGPoint {
    axis == .horizontal ? CGPoint(x: main, y: cross) : CGPoint(x: cross, y: main)
  }

  private func mainStart(_ bounds: CGRect) -> CGFloat {
    axis == .horizontal ? bounds.minX + containerPadding.leading : bounds.minY + containerPadding.top
  }

  private func crossStart(_ bounds: CGRect) -> CGFloat {
    axis == .horizontal ? bounds.minY : bounds.minX
  }

  private func availableSize(from proposal: ProposedViewSize) -> CGSize {
    // nil proposal = intrinsic sizing → treat as unconstrained (.infinity)
    CGSize(
      width: max(0, (proposal.width ?? .infinity) - containerPadding.leading - containerPadding.trailing),
      height: max(0, (proposal.height ?? .infinity) - containerPadding.top - containerPadding.bottom)
    )
  }

  // MARK: - Margin Helpers

  private func mainMarginSum(_ margin: EdgeInsets) -> CGFloat {
    axis == .horizontal
      ? margin.leading + margin.trailing
      : margin.top + margin.bottom
  }

  private func mainLeadingMargin(_ margin: EdgeInsets) -> CGFloat {
    axis == .horizontal ? margin.leading : margin.top
  }

  private func mainTrailingMargin(_ margin: EdgeInsets) -> CGFloat {
    axis == .horizontal ? margin.trailing : margin.bottom
  }

  private func crossLeadingMargin(_ margin: EdgeInsets) -> CGFloat {
    axis == .horizontal ? margin.top : margin.leading
  }

  private func crossTrailingMargin(_ margin: EdgeInsets) -> CGFloat {
    axis == .horizontal ? margin.bottom : margin.trailing
  }
}
