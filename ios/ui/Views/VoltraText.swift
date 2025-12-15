import SwiftUI

public struct VoltraText: VoltraView {
    public typealias Parameters = TextParameters

    public let element: VoltraElement

    public init(_ element: VoltraElement) {
        self.element = element
    }

    public var body: some View {
        let textContent: String = {
            if let children = element.children, case .text(let text) = children {
                return text
            }
            return ""
        }()
        let anyStyle = (element.style ?? [:]).mapValues { $0.toAny() }
        let style = StyleConverter.convert(anyStyle)
        let textStyle = style.3;

        var lineSpacing: CGFloat {
            guard let lh = textStyle.lineHeight else { return 0 }
            return max(0, lh - textStyle.fontSize)
        }
        
        var font: Font {
            var baseFont = Font.system(size: textStyle.fontSize, weight: textStyle.fontWeight)
            
            if textStyle.fontVariant.contains(.smallCaps) {
                baseFont = baseFont.smallCaps()
            }
            
            if textStyle.fontVariant.contains(.tabularNums) {
                baseFont = baseFont.monospacedDigit()
            }
            
            return baseFont
        }

        Text(.init(textContent))
            .kerning(textStyle.letterSpacing)
            .underline(textStyle.decoration == .underline || textStyle.decoration == .underlineLineThrough)
            .strikethrough(textStyle.decoration == .lineThrough || textStyle.decoration == .underlineLineThrough)
            // These technically work on View, but good to keep close
            .font(font)
            .foregroundColor(textStyle.color)
            .multilineTextAlignment(textStyle.alignment)
            .lineSpacing(lineSpacing)
            .voltraIfLet(params.numberOfLines) { view, numberOfLines in
                view.lineLimit(Int(numberOfLines))
            }
            .applyStyle(element.style)
    }
}
