//
//  ContentView.swift
//  mons
//
//  Created by Jeremy Scott on 8/3/26.
//

import SwiftUI

struct ContentView: View {
    @Environment(AppStore.self) private var store

    @State private var selection = AppTab.calories

    var body: some View {
        Group {
            if !store.hasLoadedNutritionPlan {
                ProgressView("Loading profile")
            } else if store.nutritionPlan == nil {
                OnboardingFlowView { draft in
                    await store.completeOnboarding(draft)
                }
            } else {
                TabView(selection: $selection) {
                    Tab("Calories", systemImage: "fork.knife", value: .calories) {
                        CalorieListView()
                    }

                    Tab("Workouts", systemImage: "figure.run", value: .workouts) {
                        WorkoutListView()
                    }
                }
            }
        }
        .safeAreaInset(edge: .bottom) {
            if let error = store.lastError {
                AppErrorBanner(message: error, onDismiss: store.clearError)
            }
        }
    }
}

#Preview {
    ContentView()
        .environment(AppStore.preview)
}
