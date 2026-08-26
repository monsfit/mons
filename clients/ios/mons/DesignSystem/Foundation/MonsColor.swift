import SwiftUI

public enum MonsColor {
    public static let background = Color.clear
    public static let chrome = Color.clear
    public static let surface = Color.clear
    public static let surfaceRaised = Color.secondary.opacity(0.08)
    public static let border = Color.secondary.opacity(0.25)
    public static let shadow = Color.black.opacity(0.08)

    public static let textPrimary = Color.primary
    public static let textSecondary = Color.secondary
    public static let textMuted = Color.secondary

    public static let action = Color.blue
    public static let actionSurface = Color.blue
    public static let actionForeground = Color.white
    public static let metric = Color.primary

    public static let calorieAccent = Color.orange
    public static let proteinAccent = Color.red
    public static let fatAccent = Color.yellow
    public static let carbohydrateAccent = Color.blue
    public static let weightAccent = Color.blue
    public static let workoutAccent = Color.blue
    public static let accentForeground = Color.white

    public static let error = Color.red
    public static let errorSurface = Color.red.opacity(0.10)
}
