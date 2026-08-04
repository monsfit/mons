import CoreText
import Testing
@testable import mons

struct DesignSystemTests {
    @Test func registersEveryBundledSpaceGroteskWeight() {
        MonsFontRegistrar.registerBundledFonts()

        let availableNames = Set(CTFontManagerCopyAvailablePostScriptNames() as? [String] ?? [])
        let expectedNames: Set<String> = [
            "SpaceGrotesk-Regular",
            "SpaceGrotesk-Medium",
            "SpaceGrotesk-Bold",
        ]

        #expect(expectedNames.isSubset(of: availableNames))
    }
}
