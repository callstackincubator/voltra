import SwiftUI

public struct VoltraText: VoltraView {
  public typealias Parameters = TextParameters

  public let element: VoltraElement

  public init(_ element: VoltraElement) {
    self.element = element
  }

  public var body: some View {
    let textContent: String = {
      if let children = element.children, case let .text(text) = children {
        return text
      }
      return ""
    }()
    let anyStyle = (element.style ?? [:]).mapValues { $0.toAny() }
    let style = StyleConverter.convert(anyStyle)
    let textStyle = style.3

    var font: Font {
      // If custom fontFamily is specified, use it
      if let fontFamily = textStyle.fontFamily {
        var baseFont = Font.custom(fontFamily, size: textStyle.fontSize)

        if textStyle.fontVariant.contains(.smallCaps) {
          baseFont = baseFont.smallCaps()
        }

        if textStyle.fontVariant.contains(.tabularNums) {
          baseFont = baseFont.monospacedDigit()
        }

        return baseFont
      }

      // Otherwise use system font with weight
      var baseFont = Font.system(size: textStyle.fontSize, weight: textStyle.fontWeight)

      if textStyle.fontVariant.contains(.smallCaps) {
        baseFont = baseFont.smallCaps()
      }

      if textStyle.fontVariant.contains(.tabularNums) {
        baseFont = baseFont.monospacedDigit()
      }

      return baseFont
    }

    let alignment: TextAlignment = {
      // Parameter takes precedence over style
      if let mta = params.multilineTextAlignment {
        return JSStyleParser.textAlignment(mta)
      }
      return textStyle.alignment
    }()

    let dynamicTypeRange: ClosedRange<DynamicTypeSize> = {
      let minSize = DynamicTypeSize.xSmall
      if params.allowFontScaling == false {
        return minSize ... DynamicTypeSize.large
      }
      if let multiplier = params.maxFontSizeMultiplier {
        return minSize ... DynamicTypeSize.from(multiplier: multiplier)
      }
      return minSize ... DynamicTypeSize.accessibility5
    }()

    let baseText = Text(.init(textContent))
      .kerning(textStyle.letterSpacing)
      .underline(textStyle.decoration == TextDecoration.underline || textStyle.decoration == TextDecoration.underlineLineThrough)
      .strikethrough(textStyle.decoration == TextDecoration.lineThrough || textStyle.decoration == TextDecoration.underlineLineThrough)
      .font(font)
      .foregroundColor(textStyle.color)
      .multilineTextAlignment(alignment)
      .lineSpacing(textStyle.lineSpacing)

    return baseText
      .dynamicTypeSize(dynamicTypeRange)
      .voltraIf(params.adjustsFontSizeToFit == true) { view in
        view.minimumScaleFactor(params.minimumFontScale ?? 0.01)
      }
      .voltraIfLet(params.numberOfLines) { view, numberOfLines in
        view.lineLimit(Int(numberOfLines))
      }
      .applyStyle(element.style)
  }
}
