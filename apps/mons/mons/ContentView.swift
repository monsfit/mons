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
    @State private var isShowingQuickActions = false
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

                    Tab(
                        "Add food",
                        systemImage: "plus",
                        value: .quickAdd,
                        role: .search
                    ) {
                        Color.clear
                    }
                }
                #if os(iOS)
                .tabViewBottomAccessory {
                    FoodSearchAccessory(onSearch: showFoodSearch)
                }
                #endif
                .onChange(of: selection, handleTabSelection)
                .confirmationDialog("Add food", isPresented: $isShowingQuickActions) {
                    Button("Search foods", systemImage: "magnifyingglass", action: showFoodSearch)
                    Button("Scan barcode", systemImage: "barcode.viewfinder", action: scanFood)
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

    private func scanFood() {
        addMealRequest = AddMealRequest(scheduledAt: .now, mode: .scanner)
    }

    private func showFoodSearch() {
        addMealRequest = AddMealRequest(scheduledAt: .now)
    }

    private func handleTabSelection(oldValue: AppTab, newValue: AppTab) {
        guard newValue == .quickAdd else { return }
        selection = oldValue == .quickAdd ? .dashboard : oldValue
        isShowingQuickActions = true
    }
}

#Preview {
    ContentView()
        .environment(AppStore.preview)
}
