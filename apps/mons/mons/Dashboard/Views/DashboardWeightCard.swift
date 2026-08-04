import SwiftUI

struct DashboardWeightCard: View {
    @Environment(AppStore.self) private var store

    @State private var isShowingWeightEntry = false

    let snapshot: DashboardSnapshot
    let system: MeasurementSystem

    var body: some View {
        MonsCard {
            VStack(alignment: .leading, spacing: MonsSpacing.large) {
                HStack {
                    Label("Weight Trend", systemImage: "scalemass")
                        .font(MonsTypography.title)
                        .foregroundStyle(MonsColor.textPrimary)
                    Spacer()
                    Button("Log weight", systemImage: "plus", action: showWeightEntry)
                        .buttonStyle(MonsSecondaryButtonStyle())
                }

                if let weight = displayedWeightKg {
                    HStack(alignment: .firstTextBaseline) {
                        Text(system.displayedWeight(kilograms: weight), format: .number.precision(.fractionLength(1)))
                            .font(MonsTypography.metric)
                        Text(system.weightSymbol)
                            .font(MonsTypography.subheadline)
                            .foregroundStyle(MonsColor.textSecondary)
                        Spacer()
                        if let change = snapshot.weightChangeKg {
                            VStack(alignment: .trailing) {
                                Text("Change")
                                    .font(MonsTypography.subheadline)
                                    .foregroundStyle(MonsColor.textSecondary)
                                Text(
                                    "\(system.displayedWeight(kilograms: change), format: .number.sign(strategy: .always()).precision(.fractionLength(1))) \(system.weightSymbol)"
                                )
                                .font(MonsTypography.headline)
                            }
                        }
                    }
                }

                WeightTrendChart(entries: snapshot.weightEntries, system: system)
            }
        }
        .sheet(isPresented: $isShowingWeightEntry) {
            WeightEntrySheet(initialWeightKg: initialWeightKg, system: system) { weightKg, date in
                await store.logWeight(weightKg: weightKg, measuredAt: date)
            }
        }
    }

    private var initialWeightKg: Double {
        snapshot.latestWeightKg ?? store.nutritionPlan?.currentWeightKg ?? 70
    }

    private var displayedWeightKg: Double? {
        snapshot.latestWeightKg ?? store.nutritionPlan?.currentWeightKg
    }

    private func showWeightEntry() {
        isShowingWeightEntry = true
    }
}
