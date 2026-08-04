import Foundation

enum CalorieSampleData {
    static func days(referenceDate: Date, calendar: Calendar) -> [CalorieDayData] {
        let today = calendar.startOfDay(for: referenceDate)

        return [
            CalorieDayData(
                date: today,
                calorieGoal: 2_200,
                meals: [
                    meal(
                        id: "today-breakfast",
                        title: "Greek yogurt & berries",
                        category: .breakfast,
                        day: today,
                        hour: 8,
                        minute: 5,
                        itemCount: 4,
                        calories: 430,
                        macros: MacroTotals(protein: 28, carbohydrates: 54, fat: 12),
                        calendar: calendar
                    ),
                    meal(
                        id: "today-lunch",
                        title: "Chicken grain bowl",
                        category: .lunch,
                        day: today,
                        hour: 12,
                        minute: 42,
                        itemCount: 6,
                        calories: 620,
                        macros: MacroTotals(protein: 42, carbohydrates: 68, fat: 21),
                        calendar: calendar
                    ),
                    meal(
                        id: "today-snack",
                        title: "Apple & almond butter",
                        category: .snack,
                        day: today,
                        hour: 15,
                        minute: 35,
                        itemCount: 2,
                        calories: 210,
                        macros: MacroTotals(protein: 12, carbohydrates: 24, fat: 8),
                        calendar: calendar
                    ),
                    meal(
                        id: "today-dinner",
                        title: "Salmon, rice & greens",
                        category: .dinner,
                        day: today,
                        hour: 19,
                        minute: 10,
                        itemCount: 5,
                        calories: 540,
                        macros: MacroTotals(protein: 45, carbohydrates: 49, fat: 18),
                        calendar: calendar
                    )
                ]
            ),
            sampleDay(
                offset: -1,
                relativeTo: today,
                goal: 2_200,
                calories: [510, 680, 190, 620],
                calendar: calendar
            ),
            sampleDay(
                offset: -2,
                relativeTo: today,
                goal: 2_200,
                calories: [560, 740, 310, 760],
                calendar: calendar
            ),
            .empty(on: calendar.date(byAdding: .day, value: -3, to: today) ?? today),
            sampleDay(
                offset: -4,
                relativeTo: today,
                goal: 2_200,
                calories: [470, 590, 220, 610],
                calendar: calendar
            ),
            sampleDay(
                offset: -5,
                relativeTo: today,
                goal: 2_200,
                calories: [520, 640, 180, 570],
                calendar: calendar
            ),
            sampleDay(
                offset: -6,
                relativeTo: today,
                goal: 2_200,
                calories: [490, 710, 260, 650],
                calendar: calendar
            )
        ]
    }

    private static func sampleDay(
        offset: Int,
        relativeTo today: Date,
        goal: Int,
        calories: [Int],
        calendar: Calendar
    ) -> CalorieDayData {
        let day = calendar.date(byAdding: .day, value: offset, to: today) ?? today
        let suffix = String(abs(offset))

        return CalorieDayData(
            date: day,
            calorieGoal: goal,
            meals: [
                meal(
                    id: "day-\(suffix)-breakfast",
                    title: "Eggs & sourdough",
                    category: .breakfast,
                    day: day,
                    hour: 7,
                    minute: 50,
                    itemCount: 3,
                    calories: calories[0],
                    macros: MacroTotals(protein: 31, carbohydrates: 45, fat: 20),
                    calendar: calendar
                ),
                meal(
                    id: "day-\(suffix)-lunch",
                    title: "Turkey avocado wrap",
                    category: .lunch,
                    day: day,
                    hour: 12,
                    minute: 25,
                    itemCount: 5,
                    calories: calories[1],
                    macros: MacroTotals(protein: 44, carbohydrates: 65, fat: 24),
                    calendar: calendar
                ),
                meal(
                    id: "day-\(suffix)-snack",
                    title: "Protein shake",
                    category: .snack,
                    day: day,
                    hour: 16,
                    minute: 10,
                    itemCount: 2,
                    calories: calories[2],
                    macros: MacroTotals(protein: 25, carbohydrates: 18, fat: 7),
                    calendar: calendar
                ),
                meal(
                    id: "day-\(suffix)-dinner",
                    title: "Pasta primavera",
                    category: .dinner,
                    day: day,
                    hour: 19,
                    minute: 20,
                    itemCount: 6,
                    calories: calories[3],
                    macros: MacroTotals(protein: 36, carbohydrates: 82, fat: 21),
                    calendar: calendar
                )
            ]
        )
    }

    private static func meal(
        id: String,
        title: String,
        category: MealCategory,
        day: Date,
        hour: Int,
        minute: Int,
        itemCount: Int,
        calories: Int,
        macros: MacroTotals,
        calendar: Calendar
    ) -> MealEvent {
        MealEvent(
            id: id,
            title: title,
            category: category,
            loggedAt: calendar.date(bySettingHour: hour, minute: minute, second: 0, of: day) ?? day,
            itemCount: itemCount,
            calories: calories,
            macros: macros
        )
    }
}
