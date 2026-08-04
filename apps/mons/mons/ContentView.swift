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
    @State private var isSearchPresented = false
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
                        PrimaryTabContent(onScan: scanFood, onSearch: showFoodSearch) {
                            DashboardView(
                                onShowCalories: showCalories,
                                onShowWorkouts: showWorkouts
                            )
                        }
                    }

                    Tab("Calories", systemImage: "fork.knife", value: .calories) {
                        PrimaryTabContent(onScan: scanFood, onSearch: showFoodSearch) {
                            CalorieListView()
                        }
                    }

                    Tab("Workouts", systemImage: "figure.run", value: .workouts) {
                        PrimaryTabContent(onScan: scanFood, onSearch: showFoodSearch) {
                            WorkoutListView()
                        }
                    }

                    Tab(value: .search, role: .search) {
                        PrimaryTabContent(onScan: scanFood, onSearch: showFoodSearch) {
                            FoodSearchBrowser(
                                searchText: $searchText,
                                loggedAt: .now,
                                showsModalChrome: false,
                                onLogged: showCalories
                            )
                        }
                    }
                }
                .searchable(
                    text: $searchText,
                    isPresented: $isSearchPresented,
                    prompt: "Search for a food"
                )
                #if os(iOS)
                .tabBarMinimizeBehavior(.onScrollDown)
                #endif
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
        selection = .search
        isSearchPresented = true
    }
}

#Preview {
    ContentView()
        .environment(AppStore.preview)
}
