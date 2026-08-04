import SwiftUI

struct DashboardWeightCard: View {
    @Environment(AppStore.self) private var store

    @State private var isShowingWeightEntry = false

    let snapshot: DashboardSnapshot
    let system: MeasurementSystem

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Label("Weight Trend", systemImage: "scalemass")
                    .font(.title2)
                    .bold()
                Spacer()
                Button("Log weight", systemImage: "plus", action: showWeightEntry)
                    .buttonStyle(.bordered)
                    .buttonBorderShape(.capsule)
            }

            if let weight = displayedWeightKg {
                HStack(alignment: .firstTextBaseline) {
                    Text(system.displayedWeight(kilograms: weight), format: .number.precision(.fractionLength(1)))
                        .font(.title)
                        .bold()
                    Text(system.weightSymbol)
                        .foregroundStyle(.secondary)
                    Spacer()
                    if let change = snapshot.weightChangeKg {
                        VStack(alignment: .trailing) {
                            Text("Change")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            Text(
                                "\(system.displayedWeight(kilograms: change), format: .number.sign(strategy: .always()).precision(.fractionLength(1))) \(system.weightSymbol)"
                            )
                        }
                    }
                }
            }

            WeightTrendChart(entries: snapshot.weightEntries, system: system)
        }
        .padding()
        .background(.thinMaterial, in: .rect(cornerRadius: 20))
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
