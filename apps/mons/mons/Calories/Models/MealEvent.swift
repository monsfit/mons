import Foundation

struct MealEvent: Identifiable, Hashable {
    let id: String
    let title: String
    let category: MealCategory
    let loggedAt: Date
    let itemCount: Int
    let calories: Int
    let macros: MacroTotals

    func rescheduled(to date: Date) -> MealEvent {
        MealEvent(
            id: id,
            title: title,
            category: category,
            loggedAt: date,
            itemCount: itemCount,
            calories: calories,
            macros: macros
        )
    }
}
