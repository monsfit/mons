import SwiftUI

public enum MonsColor {
    public static let background = adaptive(light: MonsPalette.plum25, dark: MonsPalette.plum1000)
    public static let chrome = adaptive(light: MonsPalette.plumWhite, dark: MonsPalette.plum950)
    public static let surface = adaptive(light: MonsPalette.plumWhite, dark: MonsPalette.plum950)
    public static let surfaceRaised = adaptive(light: MonsPalette.plum50, dark: MonsPalette.plum900)
    public static let border = adaptive(light: MonsPalette.plum150, dark: MonsPalette.plum700)

    public static let textPrimary = adaptive(light: MonsPalette.plum900, dark: MonsPalette.plumWhite)
    public static let textSecondary = adaptive(light: MonsPalette.plum600, dark: MonsPalette.plum200)
    public static let textMuted = adaptive(light: MonsPalette.plum500, dark: MonsPalette.plum300)

    public static let action = adaptive(light: MonsPalette.plum900, dark: MonsPalette.plum100)
    public static let actionSurface = action
    public static let actionForeground = adaptive(light: MonsPalette.plumWhite, dark: MonsPalette.plum1000)
    public static let metric = action

    public static let calorieAccent = MonsPalette.calorieFlame
    public static let proteinAccent = MonsPalette.protein500
    public static let fatAccent = MonsPalette.fat500
    public static let carbohydrateAccent = MonsPalette.carbohydrate500
    public static let weightAccent = MonsPalette.weight500
    public static let workoutAccent = MonsPalette.workout500
    public static let accentForeground = MonsPalette.plumWhite

    public static let error = adaptive(light: MonsPalette.error600, dark: MonsPalette.error400)
    public static let errorSurface = adaptive(light: MonsPalette.error50, dark: MonsPalette.error900)

    private static func adaptive(light: Color, dark: Color) -> Color {
        Color(MonsAdaptiveColor(light: light, dark: dark))
    }
}
