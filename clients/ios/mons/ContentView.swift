//
//  ContentView.swift
//  mons
//
//  Created by Jeremy Scott on 8/3/26.
//

import SwiftUI

struct ContentView: View {
    @Environment(AppStore.self) private var store

    @State private var selection = AppTab.dashboard
    @State private var workoutCoordinator = WorkoutCoordinator()

    init(initialSelection: AppTab = .dashboard) {
        _selection = State(initialValue: initialSelection)
    }

    var body: some View {
        Group {
            switch store.profileBootstrapState {
            case .loading:
                ZStack {
                    MonsColor.background.ignoresSafeArea()
                    ProgressView("Loading profile")
                        .font(MonsTypography.body)
                        .foregroundStyle(MonsColor.textSecondary)
                }
            case .failed(let message):
                ProfileConnectionUnavailableView(message: message) {
                    Task { await store.bootstrap() }
                }
            case .ready:
                if store.nutritionPlan == nil {
                    OnboardingFlowView { draft in
                        await store.completeOnboarding(draft)
                    }
                } else {
                    TabView(selection: $selection) {
                        Tab(AppTab.dashboard.title, systemImage: AppTab.dashboard.systemImage, value: .dashboard) {
                            DashboardView(
                                onShowCalories: showCalories,
                                onShowWorkouts: showWorkouts
                            )
                        }

                        Tab(AppTab.calories.title, systemImage: AppTab.calories.systemImage, value: .calories) {
                            CalorieListView()
                        }

                        Tab(AppTab.workouts.title, systemImage: AppTab.workouts.systemImage, value: .workouts) {
                            WorkoutListView()
                        }

                        Tab(AppTab.recipes.title, systemImage: AppTab.recipes.systemImage, value: .recipes) {
                            RecipeLibraryView()
                        }
                    }
                    .environment(workoutCoordinator)
                    .modifier(WorkoutTabAccessoryModifier())
                    #if os(iOS)
                    .toolbarBackgroundVisibility(.hidden, for: .tabBar)
                    #endif
                }
            }
        }
        .environment(workoutCoordinator)
        .appToast(store.toast, onDismiss: store.dismissToast)
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
