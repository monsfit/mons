import SwiftUI

enum MonsColor {
    static let background = adaptive(light: MonsPalette.plum25, dark: MonsPalette.plum1000)
    static let chrome = adaptive(light: MonsPalette.plumWhite, dark: MonsPalette.plum950)
    static let surface = adaptive(light: MonsPalette.plumWhite, dark: MonsPalette.plum950)
    static let surfaceRaised = adaptive(light: MonsPalette.plum50, dark: MonsPalette.plum900)
    static let border = adaptive(light: MonsPalette.plum150, dark: MonsPalette.plum700)

    static let textPrimary = adaptive(light: MonsPalette.plum900, dark: MonsPalette.plumWhite)
    static let textSecondary = adaptive(light: MonsPalette.plum600, dark: MonsPalette.plum200)
    static let textMuted = adaptive(light: MonsPalette.plum500, dark: MonsPalette.plum300)

    static let action = adaptive(light: MonsPalette.plum900, dark: MonsPalette.plum100)
    static let actionSurface = action
    static let actionForeground = adaptive(light: MonsPalette.plumWhite, dark: MonsPalette.plum1000)
    static let metric = action

    static let error = adaptive(light: MonsPalette.error600, dark: MonsPalette.error400)
    static let errorSurface = adaptive(light: MonsPalette.error50, dark: MonsPalette.error900)

    private static func adaptive(light: Color, dark: Color) -> Color {
        Color(MonsAdaptiveColor(light: light, dark: dark))
    }
}
