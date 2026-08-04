import CoreText
import Foundation

enum MonsFontRegistrar {
    private static let fontNames = [
        "SpaceGrotesk-Regular",
        "SpaceGrotesk-Medium",
        "SpaceGrotesk-Bold",
    ]

    static func registerBundledFonts(bundle: Bundle = .main) {
        for name in fontNames {
            guard let url = fontURL(named: name, bundle: bundle) else { continue }
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
    }

    private static func fontURL(named name: String, bundle: Bundle) -> URL? {
        bundle.url(forResource: name, withExtension: "ttf", subdirectory: "DesignSystem/Fonts")
            ?? bundle.url(forResource: name, withExtension: "ttf")
    }
}
