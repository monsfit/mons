import SwiftUI

public struct DashboardScreen<AccountMenu: View>: View {
    private let accountMenu: AccountMenu
    private let onLogWeight: () -> Void
    private let onRefresh: () async -> Void
    private let onShowCalories: () -> Void
    private let onShowWorkouts: () -> Void
    private let state: DashboardPresentationState

    public init(
        state: DashboardPresentationState,
        @ViewBuilder accountMenu: () -> AccountMenu,
        onShowCalories: @escaping () -> Void,
        onShowWorkouts: @escaping () -> Void,
        onLogWeight: @escaping () -> Void,
        onRefresh: @escaping () async -> Void
    ) {
        self.state = state
        self.accountMenu = accountMenu()
        self.onShowCalories = onShowCalories
        self.onShowWorkouts = onShowWorkouts
        self.onLogWeight = onLogWeight
        self.onRefresh = onRefresh
    }

    public var body: some View {
        NavigationStack {
            List {
                Section("Nutrition") {
                    Button(action: onShowCalories) {
                        LabeledContent {
                            Text("\(state.consumedCalories.formatted()) of \(state.calorieGoal.formatted()) kcal")
                                .foregroundStyle(.secondary)
                        } label: {
                            Label("Food Log", systemImage: "fork.knife")
                        }
                    }

                    ProgressView(value: calorieProgress)

                    macroRow("Protein", value: state.protein)
                    macroRow("Carbohydrates", value: state.carbohydrates)
                    macroRow("Fat", value: state.fat)
                }

                Section("Workouts") {
                    Button(action: onShowWorkouts) {
                        Label("Open Workouts", systemImage: "figure.run")
                    }

                    LabeledContent("Sessions this week", value: state.weeklyWorkoutCount.formatted())
                    LabeledContent("Minutes this week", value: state.weeklyWorkoutMinutes.formatted())

                    if let title = state.recentWorkoutTitle {
                        LabeledContent("Most recent") {
                            VStack(alignment: .trailing) {
                                Text(title)
                                if let detail = state.recentWorkoutDetail {
                                    Text(detail)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }

                Section("Weight") {
                    if let weight = state.latestWeight {
                        LabeledContent("Latest") {
                            Text("\(weight.formatted(.number.precision(.fractionLength(1)))) \(state.weightUnit)")
                        }

                        if let change = state.weightChange {
                            LabeledContent("Change") {
                                Text(change, format: .number.sign(strategy: .always()).precision(.fractionLength(1)))
                            }
                        }
                    } else {
                        Text("No weight logged")
                            .foregroundStyle(.secondary)
                    }

                    Button("Log Weight", systemImage: "plus", action: onLogWeight)
                }
            }
            .refreshable { await onRefresh() }
            .navigationTitle("Today")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    accountMenu
                }
            }
        }
    }

    private var calorieProgress: Double {
        guard state.calorieGoal > 0 else { return 0 }
        return min(max(Double(state.consumedCalories) / Double(state.calorieGoal), 0), 1)
    }

    private func macroRow(_ title: String, value: DashboardPresentationState.Macro) -> some View {
        LabeledContent(title, value: "\(value.consumed.formatted()) / \(value.target.formatted()) g")
    }
}
