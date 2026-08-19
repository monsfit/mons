import Foundation

enum CalorieTimelineItem: Identifiable, Hashable {
    case meal(MealEvent)
    case currentTime(Date)

    var id: String {
        switch self {
        case .meal(let meal):
            "meal-\(meal.id)"
        case .currentTime:
            "current-time"
        }
    }
}
