//
//  ContentView.swift
//  mons
//
//  Created by Jeremy Scott on 8/3/26.
//

import SwiftUI

struct ContentView: View {
    @Environment(AppStore.self) private var store

    @State private var addMealRequest: AddMealRequest?
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
                        #if os(iOS)
                        .toolbar(.hidden, for: .tabBar)
                        #endif
                    }

                    Tab("Calories", systemImage: "fork.knife", value: .calories) {
                        CalorieListView()
                            #if os(iOS)
                            .toolbar(.hidden, for: .tabBar)
                            #endif
                    }

                    Tab("Workouts", systemImage: "figure.run", value: .workouts) {
                        WorkoutListView()
                            #if os(iOS)
                            .toolbar(.hidden, for: .tabBar)
                            #endif
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

                if store.hasLoadedNutritionPlan, store.nutritionPlan != nil {
                    MonsAppDock(selection: $selection, onScan: scanFood, onSearch: addFood)
                }
            }
        }
        .sheet(item: $addMealRequest) { request in
            FoodSearchView(
                loggedAt: request.scheduledAt,
                startsWithScanner: request.mode == .scanner
            ) { }
        }
    }

    private func showCalories() {
        selection = .calories
    }

    private func showWorkouts() {
        selection = .workouts
    }

    private func addFood() {
        addMealRequest = AddMealRequest(scheduledAt: .now)
    }

    private func scanFood() {
        addMealRequest = AddMealRequest(scheduledAt: .now, mode: .scanner)
    }
}

#Preview {
    ContentView()
        .environment(AppStore.preview)
}
