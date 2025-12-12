import SwiftUI

public struct VoltraText: View {
    private let component: VoltraComponent

    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        let params = component.parameters(TextParameters.self)
        let textContent: String = {
            if let children = component.children, case .text(let text) = children {
                return text
            }
            return ""
        }()
        let style = StyleConverter.convert(component.style ?? [:])
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
            .applyStyle(style)
    }
}
