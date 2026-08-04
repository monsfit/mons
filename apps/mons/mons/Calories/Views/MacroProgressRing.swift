import SwiftUI

struct MacroProgressRing: View {
    @ScaledMetric(relativeTo: .body) private var lineWidth = 7.0

    let macros: MacroTotals
    let targets: NutritionTargets

    private var proteinProgress: Double {
        progress(value: macros.protein, goal: targets.protein)
    }

    private var fatProgress: Double {
        progress(value: macros.fat, goal: targets.fat)
    }

    private var carbohydrateProgress: Double {
        progress(value: macros.carbohydrates, goal: targets.carbohydrates)
    }

    var body: some View {
        ZStack {
            MacroRingSegment(
                start: 0.016_666_666_7,
                progress: proteinProgress,
                color: NutritionColor.protein,
                lineWidth: lineWidth
            )
            MacroRingSegment(
                start: 0.35,
                progress: fatProgress,
                color: NutritionColor.fat,
                lineWidth: lineWidth
            )
            MacroRingSegment(
                start: 0.683_333_333_3,
                progress: carbohydrateProgress,
                color: NutritionColor.carbohydrates,
                lineWidth: lineWidth
            )
        }
        .rotationEffect(.degrees(-90))
        .accessibilityHidden(true)
    }

    private func progress(value: Int, goal: Int) -> Double {
        guard goal > 0 else { return 0 }
        return min(max(Double(value) / Double(goal), 0), 1)
    }
}
