import MonsDesignSystem
import SwiftUI

struct DashboardNutritionPresentationCard: View {
    let state: DashboardPresentationState
    let onShowCalories: () -> Void

    var body: some View {
        MonsCard {
            VStack(alignment: .leading, spacing: MonsSpacing.xLarge) {
                HStack {
                    VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                        Text("TODAY'S NUTRITION")
                            .font(MonsTypography.caption)
                        Text("Food Log Focus").font(MonsTypography.title)
                    }
                    Spacer()
                    Button("Open calories", systemImage: "chevron.right", action: onShowCalories)
                        .labelStyle(.iconOnly)
                        .frame(minWidth: 44, minHeight: 44)
                        .buttonStyle(.glass)
                        .buttonBorderShape(.circle)
                }

                HStack {
                    metric(max(state.calorieGoal - state.consumedCalories, 0), label: "Remaining")
                    calorieGauge.frame(maxWidth: .infinity)
                    metric(state.calorieGoal, label: "Target")
                }

                ViewThatFits(in: .horizontal) {
                    HStack { macroMetrics }
                    VStack { macroMetrics }
                }
            }
        }
    }

    @ViewBuilder private var macroMetrics: some View {
        macro(state.protein, title: "Protein", color: MonsColor.proteinAccent)
        macro(state.fat, title: "Fat", color: MonsColor.fatAccent)
        macro(state.carbohydrates, title: "Carbs", color: MonsColor.carbohydrateAccent)
    }

    private var calorieGauge: some View {
        let progress = state.calorieGoal == 0
            ? 0
            : min(max(Double(state.consumedCalories) / Double(state.calorieGoal), 0), 1)
        return ZStack {
            Circle()
                .trim(from: 0.08, to: 0.92)
                .stroke(MonsColor.border, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                .rotationEffect(.degrees(90))
            Circle()
                .trim(from: 0.08, to: 0.08 + 0.84 * progress)
                .stroke(MonsColor.calorieAccent, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                .rotationEffect(.degrees(90))
            VStack {
                Text(state.consumedCalories, format: .number).font(MonsTypography.metric)
                Text("Consumed")
                    .font(MonsTypography.subheadline)
                    .foregroundStyle(MonsColor.textSecondary)
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .frame(maxWidth: 150)
    }

    private func metric(_ value: Int, label: String) -> some View {
        VStack {
            Text(value, format: .number).font(MonsTypography.title)
            Text(label)
                .font(MonsTypography.subheadline)
                .foregroundStyle(MonsColor.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }

    private func macro(
        _ value: DashboardPresentationState.Macro,
        title: String,
        color: Color
    ) -> some View {
        VStack(alignment: .leading) {
            Text(title)
                .font(MonsTypography.subheadline)
                .foregroundStyle(MonsColor.textSecondary)
            ProgressView(value: value.target == 0 ? 0 : Double(value.consumed) / Double(value.target))
                .tint(color)
            Text("\(value.consumed.formatted()) / \(value.target.formatted()) g")
                .font(MonsTypography.subheadline)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
