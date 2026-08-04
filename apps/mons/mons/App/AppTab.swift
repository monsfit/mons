import Foundation

enum AppTab: CaseIterable, Hashable, Identifiable {
    case dashboard
    case calories
    case workouts

    var id: Self { self }

    var title: String {
        switch self {
        case .dashboard: "Dashboard"
        case .calories: "Calories"
        case .workouts: "Workouts"
        }
    }

    var systemImage: String {
        switch self {
        case .dashboard: "square.grid.2x2"
        case .calories: "fork.knife"
        case .workouts: "figure.run"
        }
    }
}
