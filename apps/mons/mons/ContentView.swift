//
//  ContentView.swift
//  mons
//
//  Created by Jeremy Scott on 8/3/26.
//

import SwiftUI

struct ContentView: View {
    @State private var selection = AppTab.calories

    var body: some View {
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

#Preview {
    ContentView()
}
