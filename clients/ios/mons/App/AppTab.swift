enum AppTab: CaseIterable, Hashable, Identifiable {
    case dashboard
    case calories
    case workouts
    case recipes

    static let primaryTabs = allCases

    var id: Self { self }

    var title: String {
        switch self {
        case .dashboard: "Dashboard"
        case .calories: "Calories"
        case .workouts: "Workouts"
        case .recipes: "Recipes"
        }
    }

    var systemImage: String {
        switch self {
        case .dashboard: "square.grid.2x2"
        case .calories: "fork.knife"
        case .workouts: "figure.run"
        case .recipes: "book.closed"
        }
    }

    var selectedSystemImage: String {
        switch self {
        case .dashboard: "square.grid.2x2.fill"
        case .calories: systemImage
        case .workouts: systemImage
        case .recipes: "book.closed.fill"
        }
    }
}
