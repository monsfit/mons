import Foundation
import Testing
@testable import mons

struct DashboardBuilderTests {
    @Test func buildsDeterministicDailyAndTrendSummary() throws {
        let calendar = testCalendar()
        let referenceDate = try #require(
            calendar.date(from: DateComponents(year: 2026, month: 8, day: 4, hour: 12))
        )
        let food = FoodLogEntry(
            brand: nil,
            calories: 656,
            carbohydrates: 85,
            datasetKind: .raw,
            entryId: try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000050")),
            fat: 20,
            foodId: "1",
            gtin: nil,
            loggedAt: referenceDate,
            mealCategory: .lunch,
            name: "Lunch",
            protein: 42,
            quantityGrams: 300
        )
        let workouts = [
            WorkoutSession(
                id: "workout",
                title: "Strength",
                completedAt: referenceDate,
                durationMinutes: 45,
                metric: .strength(exercises: 4, sets: 12)
            )
        ]
        let weights = [
            WeightLogEntry(
                entryId: try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000052")),
                measuredAt: referenceDate,
                weightKg: 68
            ),
            WeightLogEntry(
                entryId: try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000051")),
                measuredAt: try #require(calendar.date(byAdding: .day, value: -7, to: referenceDate)),
                weightKg: 69
            ),
        ]

        let snapshot = DashboardBuilder.snapshot(
            foodLog: [food],
            workouts: workouts,
            weightEntries: weights,
            calorieGoal: 1_220,
            referenceDate: referenceDate,
            calendar: calendar
        )

        #expect(snapshot.day.consumedCalories == 656)
        #expect(snapshot.day.remainingCalories == 564)
        #expect(snapshot.day.macros == MacroTotals(protein: 42, carbohydrates: 85, fat: 20))
        #expect(snapshot.weeklyWorkoutCount == 1)
        #expect(snapshot.weeklyWorkoutMinutes == 45)
        #expect(snapshot.latestWeightKg == 68)
        #expect(snapshot.weightChangeKg == -1)
        #expect(snapshot.weightEntries.map(\.weightKg) == [69, 68])
    }

    @Test func convertsWeightUnitsWithoutChangingCanonicalValue() {
        let pounds = MeasurementSystem.imperial.displayedWeight(kilograms: 68)
        let kilograms = MeasurementSystem.imperial.kilograms(displayedWeight: pounds)

        #expect(abs(pounds - 149.914_338_282_4) < 0.000_000_1)
        #expect(abs(kilograms - 68) < 0.000_000_1)
    }

    private func testCalendar() -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .gmt
        calendar.firstWeekday = 2
        return calendar
    }
}
