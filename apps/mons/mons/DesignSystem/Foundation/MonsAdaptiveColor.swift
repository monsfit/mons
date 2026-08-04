import SwiftUI

public nonisolated struct MonsAdaptiveColor: ShapeStyle, Hashable {
    public let light: Color
    public let dark: Color

    public init(light: Color, dark: Color) {
        self.light = light
        self.dark = dark
    }

    public func resolve(in environment: EnvironmentValues) -> Color.Resolved {
        let color = environment.colorScheme == .dark ? dark : light
        return color.resolve(in: environment)
    }
}
