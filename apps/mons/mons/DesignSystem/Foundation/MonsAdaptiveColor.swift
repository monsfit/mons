import SwiftUI

nonisolated struct MonsAdaptiveColor: ShapeStyle, Hashable {
    let light: Color
    let dark: Color

    func resolve(in environment: EnvironmentValues) -> Color.Resolved {
        let color = environment.colorScheme == .dark ? dark : light
        return color.resolve(in: environment)
    }
}
