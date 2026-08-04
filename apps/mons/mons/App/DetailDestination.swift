import Foundation

struct DetailDestination: Identifiable, Hashable {
    let id: String
    let title: String
    let subtitle: String
    let systemImage: String

    init(meal: MealEvent) {
        id = "meal-\(meal.id)"
        title = meal.title
        subtitle = "Meal details will be designed in the next pass."
        systemImage = meal.category.systemImage
    }

    init(workout: WorkoutSession) {
        id = "workout-\(workout.id)"
        title = workout.title
        subtitle = "Workout details will be designed in the next pass."
        systemImage = workout.metric.kind.systemImage
    }
}
