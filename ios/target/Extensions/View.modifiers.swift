import SwiftUI

extension View {
    /// Apply type-safe modifiers to the view
    ///
    /// - Parameter component: The component with modifiers to apply
    /// - Returns: The modified view
    public func voltraModifiers(_ component: VoltraComponent) -> some View {
        var allModifiers: [VoltraModifier] = []
        
        // Convert style to modifiers if present
        if let style = component.style {
            let converter = StyleConverter()
            let styleModifiers = converter.getModifiersFromStyle(style)
            allModifiers.append(contentsOf: styleModifiers)
        }
        
        // Add existing modifiers
        if let existingModifiers = component.modifiers {
            allModifiers.append(contentsOf: existingModifiers)
        }
        
        if !allModifiers.isEmpty {
            return AnyView(self.applyModifiers(allModifiers))
        }
        return AnyView(self)
    }

    /// Apply a standalone modifier list to the view
    ///
    /// - Parameter modifiers: The modifiers to apply
    /// - Returns: The modified view
    public func voltraModifiers(_ modifiers: [VoltraModifier]) -> some View {
        AnyView(self.applyModifiers(modifiers))
    }

    private func applyModifiers(_ modifiers: [VoltraModifier]) -> AnyView {
        let helper = VoltraHelper()
        var tempView = AnyView(self)

        for modifier in modifiers {
            switch modifier.name {
            case "tint":
                if #available(iOS 15.0, macOS 12.0, tvOS 15.0, watchOS 8.0, *),
                   let colorName = modifier.args?["color"]?.toString(),
                   let color = helper.translateColor(colorName) {
                    tempView = AnyView(tempView.tint(color))
                }

            case "gaugeStyle":
                if #available(iOS 16.0, macOS 13.0, tvOS 16.0, watchOS 9.0, *),
                   let styleName = modifier.args?["style"]?.toString()?.lowercased() {
                    switch styleName {
                    case "accessorycircular":
                        tempView = AnyView(tempView.gaugeStyle(.accessoryCircular))
                    case "accessorylinear":
                        tempView = AnyView(tempView.gaugeStyle(.accessoryLinear))
                    case "linearcapacity":
                        tempView = AnyView(tempView.gaugeStyle(.linearCapacity))
                    case "automatic":
                        if #available(iOS 17.0, *) {
                            tempView = AnyView(tempView.gaugeStyle(.automatic))
                        }
                    default:
                        break
                    }
                }

            case "frame":
                if #available(iOS 13.0, macOS 10.15, tvOS 13.0, watchOS 6.0, *) {
                    // Extract all frame parameters
                    let width = modifier.args?["width"]?.toDouble() ?? modifier.args?["width"]?.toInt().map(Double.init)
                    let height = modifier.args?["height"]?.toDouble() ?? modifier.args?["height"]?.toInt().map(Double.init)
                    let maxWidthInfinity = modifier.args?["maxWidth"]?.toString() == "infinity"
                    let maxHeightInfinity = modifier.args?["maxHeight"]?.toString() == "infinity"
                    let minWidth = modifier.args?["minWidth"]?.toDouble() ?? modifier.args?["minWidth"]?.toInt().map(Double.init)
                    let minHeight = modifier.args?["minHeight"]?.toDouble() ?? modifier.args?["minHeight"]?.toInt().map(Double.init)
                    let idealWidth = modifier.args?["idealWidth"]?.toDouble() ?? modifier.args?["idealWidth"]?.toInt().map(Double.init)
                    let idealHeight = modifier.args?["idealHeight"]?.toDouble() ?? modifier.args?["idealHeight"]?.toInt().map(Double.init)
                    
                    // Check if we have any frame parameters
                    let hasAnyParam = width != nil || height != nil || maxWidthInfinity || maxHeightInfinity || 
                                     minWidth != nil || minHeight != nil || idealWidth != nil || idealHeight != nil
                    
                    if hasAnyParam {
                        // Use fixed frame only when both width and height are specified AND no flexible constraints
                        let useFixedFrame = width != nil && height != nil && !maxWidthInfinity && !maxHeightInfinity && 
                                          minWidth == nil && minHeight == nil && idealWidth == nil && idealHeight == nil
                        
                        if useFixedFrame {
                            tempView = AnyView(tempView.frame(width: CGFloat(width!), height: CGFloat(height!)))
                        } else {
                            // Use flexible frame API with all parameters
                            // Determine ideal width: use idealWidth if provided, otherwise use width
                            let finalIdealWidth: CGFloat? = idealWidth.map { CGFloat($0) } ?? width.map { CGFloat($0) }
                            // Determine ideal height: use idealHeight if provided, otherwise use height
                            let finalIdealHeight: CGFloat? = idealHeight.map { CGFloat($0) } ?? height.map { CGFloat($0) }
                            // Determine max width: infinity if specified, otherwise use width
                            // If only minWidth is set (flexShrink case), don't set maxWidth to allow shrinking
                            let finalMaxWidth: CGFloat?
                            if maxWidthInfinity {
                                finalMaxWidth = .infinity
                            } else if width != nil {
                                finalMaxWidth = CGFloat(width!)
                            } else if minWidth != nil && idealWidth == nil && width == nil && !maxWidthInfinity {
                                // Only minWidth set (flexShrink), don't constrain maxWidth
                                finalMaxWidth = nil
                            } else {
                                finalMaxWidth = nil
                            }
                            // Determine max height: infinity if specified, otherwise use height
                            // If only minHeight is set (flexShrink case), don't set maxHeight to allow shrinking
                            let finalMaxHeight: CGFloat?
                            if maxHeightInfinity {
                                finalMaxHeight = .infinity
                            } else if height != nil {
                                finalMaxHeight = CGFloat(height!)
                            } else if minHeight != nil && idealHeight == nil && height == nil && !maxHeightInfinity {
                                // Only minHeight set (flexShrink), don't constrain maxHeight
                                finalMaxHeight = nil
                            } else {
                                finalMaxHeight = nil
                            }
                            
                            // Use .leading alignment for frame to respect VStack/HStack alignment
                            // The frame alignment affects how the view is positioned, not children alignment
                            tempView = AnyView(tempView.frame(
                                minWidth: minWidth.map { CGFloat($0) } ?? 0,
                                idealWidth: finalIdealWidth,
                                maxWidth: finalMaxWidth,
                                minHeight: minHeight.map { CGFloat($0) } ?? 0,
                                idealHeight: finalIdealHeight,
                                maxHeight: finalMaxHeight,
                                alignment: .leading
                            ))
                            
                            // If only minWidth/minHeight are set (flexShrink with flexGrow: 0 case),
                            // use fixedSize AFTER frame to override the default .infinity constraint
                            if minWidth != nil && finalMaxWidth == nil && finalIdealWidth == nil && width == nil {
                                // Only minWidth set, use fixedSize to allow natural sizing and override .infinity
                                tempView = AnyView(tempView.fixedSize(horizontal: true, vertical: false))
                            }
                            if minHeight != nil && finalMaxHeight == nil && finalIdealHeight == nil && height == nil {
                                // Only minHeight set, use fixedSize to allow natural sizing and override .infinity
                                tempView = AnyView(tempView.fixedSize(horizontal: false, vertical: true))
                            }
                        }
                    }
                }

            case "foregroundStyle":
                if #available(iOS 15.0, macOS 12.0, tvOS 15.0, watchOS 8.0, *),
                   let colorName = modifier.args?["color"]?.toString(),
                   let color = helper.translateColor(colorName) {
                    tempView = AnyView(tempView.foregroundStyle(color))
                }

            case "backgroundStyle", "background":
                if #available(iOS 16.0, macOS 13.0, tvOS 16.0, watchOS 9.0, *),
                   let colorName = modifier.args?["color"]?.toString(),
                   let color = helper.translateColor(colorName) {
                    tempView = AnyView(tempView.background(color))
                }

            case "fontWeight":
                if #available(iOS 16.0, macOS 13.0, tvOS 16.0, watchOS 9.0, *),
                   let weightStr = modifier.args?["weight"]?.toString(),
                   let weight = helper.translateFontWeight(weightStr) {
                    tempView = AnyView(tempView.fontWeight(weight))
                }

            case "italic":
                if #available(iOS 13.0, macOS 10.15, tvOS 13.0, watchOS 6.0, *) {
                    // default enabled unless explicitly false
                    let enabled = modifier.args?["enabled"]?.toBool() ?? true
                    if enabled {
                        tempView = AnyView(tempView.italic())
                    }
                }

            case "font":
                if #available(iOS 13.0, macOS 10.15, tvOS 13.0, watchOS 6.0, *),
                   let size = modifier.args?["size"]?.toDouble() ?? modifier.args?["size"]?.toInt().map(Double.init) {
                    var font: Font
                    
                    // Create base font with size and optional weight
                    if let weightStr = modifier.args?["weight"]?.toString(),
                       let weight = helper.translateFontWeight(weightStr) {
                        font = .system(size: CGFloat(size), weight: weight)
                    } else {
                        font = .system(size: CGFloat(size))
                    }
                    
                    // Apply font variants if present
                    if #available(iOS 14.0, macOS 11.0, tvOS 14.0, watchOS 7.0, *),
                       modifier.args?["smallCaps"]?.toBool() == true {
                        font = font.smallCaps()
                    }
                    
                    if #available(iOS 15.0, macOS 12.0, tvOS 15.0, watchOS 8.0, *),
                       modifier.args?["monospacedDigit"]?.toBool() == true {
                        font = font.monospacedDigit()
                    }
                    
                    tempView = AnyView(tempView.font(font))
                }

            case "padding":
                if #available(iOS 13.0, macOS 10.15, tvOS 13.0, watchOS 6.0, *) {
                    if let length = modifier.args?["all"]?.toInt() ?? modifier.args?["all"]?.toDouble().map(Int.init) {
                        tempView = AnyView(tempView.padding(CGFloat(length)))
                    } else {
                        let top = modifier.args?["top"]?.toDouble()
                        let bottom = modifier.args?["bottom"]?.toDouble()
                        let leading = modifier.args?["leading"]?.toDouble()
                        let trailing = modifier.args?["trailing"]?.toDouble()
                        var v = tempView
                        if let t = top { v = AnyView(v.padding(.top, CGFloat(t))) }
                        if let b = bottom { v = AnyView(v.padding(.bottom, CGFloat(b))) }
                        if let l = leading { v = AnyView(v.padding(.leading, CGFloat(l))) }
                        if let r = trailing { v = AnyView(v.padding(.trailing, CGFloat(r))) }
                        tempView = AnyView(v)
                    }
                }

            case "opacity":
                if #available(iOS 13.0, macOS 10.15, tvOS 13.0, watchOS 6.0, *),
                   let opacity = modifier.args?["value"]?.toDouble() ?? modifier.args?["value"]?.toInt().map(Double.init) {
                    tempView = AnyView(tempView.opacity(opacity))
                }

            case "cornerRadius":
                if #available(iOS 13.0, macOS 10.15, tvOS 13.0, watchOS 6.0, *) {
                    if let r = modifier.args?["radius"]?.toDouble() {
                        tempView = AnyView(tempView.cornerRadius(CGFloat(r)))
                    } else if let ri = modifier.args?["radius"]?.toInt() {
                        tempView = AnyView(tempView.cornerRadius(CGFloat(ri)))
                    }
                }

            case "border":
                if #available(iOS 13.0, *) {
                    let width = modifier.args?["width"]?.toDouble() ?? modifier.args?["width"]?.toInt().map(Double.init) ?? 1.0
                    let colorName = modifier.args?["color"]?.toString()
                    let corner = modifier.args?["cornerRadius"]?.toDouble()
                    let color = (colorName.flatMap { helper.translateColor($0) }) ?? Color.primary.opacity(0.25)
                    var newView = AnyView(tempView.overlay(
                        Group {
                            if let c = corner {
                                RoundedRectangle(cornerRadius: CGFloat(c)).stroke(color, lineWidth: CGFloat(width))
                            } else {
                                Rectangle().stroke(color, lineWidth: CGFloat(width))
                            }
                        }
                    ))
                    if let c = corner {
                        newView = AnyView(newView.clipShape(RoundedRectangle(cornerRadius: CGFloat(c))))
                    }
                    tempView = newView
                }

            case "shadow":
                if #available(iOS 13.0, *) {
                    let colorName = modifier.args?["color"]?.toString()
                    let opacity = modifier.args?["opacity"]?.toDouble() ?? 1.0
                    let radius = modifier.args?["radius"]?.toDouble() ?? 3.0
                    let x = modifier.args?["x"]?.toDouble() ?? 0.0
                    let y = modifier.args?["y"]?.toDouble() ?? 0.0
                    let color = (colorName.flatMap { helper.translateColor($0) } ?? Color.black).opacity(opacity)
                    tempView = AnyView(tempView.shadow(color: color, radius: CGFloat(radius), x: CGFloat(x), y: CGFloat(y)))
                }

            case "offset":
                if #available(iOS 13.0, *) {
                    let x = modifier.args?["x"]?.toDouble() ?? 0.0
                    let y = modifier.args?["y"]?.toDouble() ?? 0.0
                    tempView = AnyView(tempView.offset(x: CGFloat(x), y: CGFloat(y)))
                }

            case "flexShrink":
                if #available(iOS 13.0, *) {
                    let preventShrink = modifier.args?["preventShrink"]?.toBool() ?? false
                    if preventShrink {
                        // flexShrink: 0 - Do not shrink below content size
                        tempView = AnyView(tempView.fixedSize())
                    }
                }

            case "position":
                if #available(iOS 13.0, macOS 10.15, tvOS 13.0, watchOS 6.0, *) {
                    if let x = modifier.args?["x"]?.toDouble(),
                       let y = modifier.args?["y"]?.toDouble() {
                        tempView = AnyView(tempView.position(x: CGFloat(x), y: CGFloat(y)))
                    }
                }

            case "scaleEffect":
                if #available(iOS 13.0, *) {
                    if let value = modifier.args?["value"]?.toDouble() ?? modifier.args?["value"]?.toInt().map(Double.init) {
                        tempView = AnyView(tempView.scaleEffect(CGFloat(value)))
                    } else {
                        let x = modifier.args?["x"]?.toDouble() ?? 1.0
                        let y = modifier.args?["y"]?.toDouble() ?? 1.0
                        tempView = AnyView(tempView.scaleEffect(x: CGFloat(x), y: CGFloat(y)))
                    }
                }

            case "rotationEffect":
                if #available(iOS 13.0, *) {
                    if let deg = modifier.args?["degrees"]?.toDouble() ?? modifier.args?["degrees"]?.toInt().map(Double.init) {
                        tempView = AnyView(tempView.rotationEffect(.degrees(deg)))
                    }
                }

            case "clipped":
                if #available(iOS 13.0, *) {
                    let enabled = modifier.args?["enabled"]?.toBool() ?? true
                    if enabled { tempView = AnyView(tempView.clipped()) }
                }

            case "multilineTextAlignment":
                if #available(iOS 13.0, *) {
                    let v = modifier.args?["value"]?.toString()?.lowercased()
                    let alignment: TextAlignment
                    switch v {
                    case "center": alignment = .center
                    case "right": alignment = .trailing
                    default: alignment = .leading
                    }
                    tempView = AnyView(tempView.multilineTextAlignment(alignment))
                }

            case "lineLimit":
                if #available(iOS 13.0, *) {
                    if let n = modifier.args?["value"]?.toInt() ?? modifier.args?["value"]?.toDouble().map(Int.init) {
                        tempView = AnyView(tempView.lineLimit(n))
                    }
                }

            case "lineSpacing":
                if #available(iOS 13.0, *) {
                    if let n = modifier.args?["value"]?.toDouble() ?? modifier.args?["value"]?.toInt().map(Double.init) {
                        tempView = AnyView(tempView.lineSpacing(CGFloat(n)))
                    }
                }

            case "kerning":
                if #available(iOS 13.0, *) {
                    if let n = modifier.args?["value"]?.toDouble() ?? modifier.args?["value"]?.toInt().map(Double.init) {
                        tempView = AnyView(tempView.kerning(CGFloat(n)))
                    }
                }

            case "underline":
                if #available(iOS 13.0, *) {
                    let enabled = modifier.args?["enabled"]?.toBool() ?? true
                    if enabled {
                        if let colorName = modifier.args?["color"]?.toString(), let color = helper.translateColor(colorName) {
                            tempView = AnyView(tempView.underline(true, color: color))
                        } else {
                            tempView = AnyView(tempView.underline(true))
                        }
                    }
                }

            case "strikethrough":
                if #available(iOS 13.0, *) {
                    let enabled = modifier.args?["enabled"]?.toBool() ?? true
                    if enabled {
                        if let colorName = modifier.args?["color"]?.toString(), let color = helper.translateColor(colorName) {
                            tempView = AnyView(tempView.strikethrough(true, color: color))
                        } else {
                            tempView = AnyView(tempView.strikethrough(true))
                        }
                    }
                }

            case "glassEffect":
                // iOS 26+ Liquid Glass.
                // Args (subset, conservative to ensure build on earlier SDKs is unaffected at compile time):
                //   shape?: "rect" | "roundedRect" | "capsule" | "circle"
                //   cornerRadius?: number (used when shape is rect/roundedRect)
                //   interactive?: boolean (reserved; no-op for now)
                if #available(iOS 26.0, *) {
                    // Optional gate for debugging/fallbacks: when enabled is false, skip applying the effect.
                    let enabled = modifier.args?["enabled"]?.toBool() ?? true
                    if !enabled { break }
                    var newView = AnyView(tempView.glassEffect())

                    // Optional shaping
                    let shapeStr = modifier.args?["shape"]?.toString()?.lowercased()
                    let corner = modifier.args?["cornerRadius"]?.toDouble()
                    switch shapeStr {
                    case "circle":
                        newView = AnyView(newView.clipShape(Circle()))
                    case "capsule":
                        newView = AnyView(newView.clipShape(Capsule()))
                    case "roundedrect", "rect":
                        if let c = corner { newView = AnyView(newView.clipShape(RoundedRectangle(cornerRadius: CGFloat(c)))) }
                    default:
                        break
                    }

                    tempView = newView
                }

            default:
                break
            }
        }

        return tempView
    }
}
