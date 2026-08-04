//
//  ContentView.swift
//  mons
//
//  Created by Jeremy Scott on 8/3/26.
//

import SwiftUI

struct ContentView: View {
    @Environment(AppStore.self) private var store

    @State private var searchText = ""
    @State private var selection = AppTab.dashboard

    var body: some View {
        Group {
            if !store.hasLoadedNutritionPlan {
                ZStack {
                    MonsColor.background.ignoresSafeArea()
                    ProgressView("Loading profile")
                        .font(MonsTypography.body)
                        .foregroundStyle(MonsColor.textSecondary)
                }
            } else if store.nutritionPlan == nil {
                OnboardingFlowView { draft in
                    await store.completeOnboarding(draft)
                }
            } else {
                TabView(selection: $selection) {
                    Tab("Dashboard", systemImage: "square.grid.2x2", value: .dashboard) {
                        DashboardView(
                            onShowCalories: showCalories,
                            onShowWorkouts: showWorkouts
                        )
                    }

                    Tab("Calories", systemImage: "fork.knife", value: .calories) {
                        CalorieListView()
                    }

                    Tab("Workouts", systemImage: "figure.run", value: .workouts) {
                        WorkoutListView()
                    }

                    Tab(value: .search, role: .search) {
                        FoodSearchBrowser(
                            searchText: $searchText,
                            loggedAt: .now,
                            showsModalChrome: false,
                            onLogged: showCalories
                        )
                    }
                }
            }
        }
        .foregroundStyle(MonsColor.textPrimary)
        .background(MonsColor.background.ignoresSafeArea())
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: MonsSpacing.small) {
                if let error = store.lastError {
                    AppErrorBanner(message: error, onDismiss: store.clearError)
                }
            }
        }
    }

    private func showCalories() {
        selection = .calories
    }

    private func showWorkouts() {
        selection = .workouts
    }

}

#Preview {
    ContentView()
        .environment(AppStore.preview)
}
