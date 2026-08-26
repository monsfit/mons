import Foundation

struct CalorieMealSection: Identifiable, Hashable {
    let category: MealCategory
    let meals: [MealEvent]

    var id: MealCategory { category }
}
