import CoreText
import Foundation

public enum MonsFontRegistrar {
    private static let fontNames = [
        "SpaceGrotesk-Regular",
        "SpaceGrotesk-Medium",
        "SpaceGrotesk-Bold",
    ]

    public static func registerBundledFonts(bundle: Bundle? = nil) {
        let bundle = bundle ?? resourceBundle
        for name in fontNames {
            guard let url = fontURL(named: name, bundle: bundle) else { continue }
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
    }

    private static var resourceBundle: Bundle {
        #if SWIFT_PACKAGE
        .module
        #else
        .main
        #endif
    }

    private static func fontURL(named name: String, bundle: Bundle) -> URL? {
        bundle.url(forResource: name, withExtension: "ttf", subdirectory: "DesignSystem/Fonts")
            ?? bundle.url(forResource: name, withExtension: "ttf")
    }
}
