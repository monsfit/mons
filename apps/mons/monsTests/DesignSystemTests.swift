import CoreText
import SwiftUI
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

    @Test func semanticColorsMeetContrastTargetsInBothAppearances() {
        var light = EnvironmentValues()
        light.colorScheme = .light

        var dark = EnvironmentValues()
        dark.colorScheme = .dark

        for environment in [light, dark] {
            #expect(contrastRatio(MonsColor.textPrimary, MonsColor.background, in: environment) >= 7)
            #expect(contrastRatio(MonsColor.textSecondary, MonsColor.background, in: environment) >= 4.5)
            #expect(contrastRatio(MonsColor.textMuted, MonsColor.background, in: environment) >= 4.5)
            #expect(contrastRatio(MonsColor.error, MonsColor.background, in: environment) >= 4.5)
            #expect(contrastRatio(MonsColor.error, MonsColor.errorSurface, in: environment) >= 4.5)
            #expect(contrastRatio(MonsColor.actionForeground, MonsColor.actionSurface, in: environment) >= 7)
        }
    }

    @Test func nutritionUsesDistinctSemanticAccents() {
        #expect(NutritionColor.calories != NutritionColor.protein)
        #expect(NutritionColor.protein != NutritionColor.fat)
        #expect(NutritionColor.fat != NutritionColor.carbohydrates)
        #expect(NutritionColor.carbohydrates != NutritionColor.calories)
    }

    private func contrastRatio(
        _ foreground: Color,
        _ background: Color,
        in environment: EnvironmentValues
    ) -> Float {
        let foregroundLuminance = luminance(foreground.resolve(in: environment))
        let backgroundLuminance = luminance(background.resolve(in: environment))
        let lighter = max(foregroundLuminance, backgroundLuminance)
        let darker = min(foregroundLuminance, backgroundLuminance)
        return (lighter + 0.05) / (darker + 0.05)
    }

    private func luminance(_ color: Color.Resolved) -> Float {
        (0.2126 * linearized(color.red))
            + (0.7152 * linearized(color.green))
            + (0.0722 * linearized(color.blue))
    }

    private func linearized(_ component: Float) -> Float {
        component <= 0.04045
            ? component / 12.92
            : pow((component + 0.055) / 1.055, 2.4)
    }
}
