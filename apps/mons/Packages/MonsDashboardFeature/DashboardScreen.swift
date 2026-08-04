import MonsDesignSystem
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
            ScrollView {
                LazyVStack(alignment: .leading, spacing: MonsSpacing.xLarge) {
                    DashboardPresentationHeader(date: state.date, accountMenu: accountMenu)
                    DashboardNutritionPresentationCard(
                        state: state,
                        onShowCalories: onShowCalories
                    )
                    DashboardWorkoutPresentationCard(
                        state: state,
                        onShowWorkouts: onShowWorkouts
                    )
                    DashboardWeightPresentationCard(state: state, onLogWeight: onLogWeight)
                }
                .padding(MonsSpacing.large)
            }
            .background(MonsColor.background)
            .foregroundStyle(MonsColor.textPrimary)
            .refreshable { await onRefresh() }
            #if os(iOS)
            .toolbar(.hidden, for: .navigationBar)
            #endif
        }
        .task { MonsFontRegistrar.registerBundledFonts() }
    }
}
