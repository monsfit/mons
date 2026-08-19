import Foundation
import Testing
@testable import mons

struct NutritionPlanCalculatorTests {
    @Test func calculatesTheSameInitialLossPlanAsTheServerFixture() throws {
        let calendar = testCalendar()
        let referenceDate = try #require(
            calendar.date(from: DateComponents(year: 2026, month: 8, day: 4, hour: 12))
        )
        var draft = OnboardingDraft(referenceDate: referenceDate, calendar: calendar)
        draft.birthDate = try #require(
            calendar.date(from: DateComponents(year: 1998, month: 2, day: 18))
        )
        draft.currentWeightKg = 56.7
        draft.dailyActivity = .mostlySedentary
        draft.exerciseFrequency = .none
        draft.heightCm = 160
        draft.metabolicSex = .female
        draft.targetWeightKg = 52
        draft.weeklyWeightChangePercent = 0.5
        draft.weightGoal = .lose

        let estimate = NutritionPlanCalculator.estimate(
            draft: draft,
            referenceDate: referenceDate,
            calendar: calendar
        )

        #expect(estimate.restingEnergyKcal == 1_266)
        #expect(estimate.estimatedExpenditureKcal == 1_772)
        #expect(estimate.calorieTargetKcal == 1_460)
        #expect(estimate.estimatedWeeks == 16.6)
        #expect(!estimate.rateLimited)
        #expect(NutritionPlanCalculator.request(draft: draft, calendar: calendar).birthDate == "1998-02-18")
    }

    @Test func limitsARequestedTargetBelowOneThousandCalories() throws {
        let calendar = testCalendar()
        let referenceDate = try #require(
            calendar.date(from: DateComponents(year: 2026, month: 8, day: 4, hour: 12))
        )
        var draft = OnboardingDraft(referenceDate: referenceDate, calendar: calendar)
        draft.birthDate = try #require(
            calendar.date(from: DateComponents(year: 1998, month: 2, day: 18))
        )
        draft.currentWeightKg = 45
        draft.heightCm = 150
        draft.targetWeightKg = 35
        draft.weeklyWeightChangePercent = 1.25

        let estimate = NutritionPlanCalculator.estimate(
            draft: draft,
            referenceDate: referenceDate,
            calendar: calendar
        )

        #expect(estimate.calorieTargetKcal == 1_000)
        #expect(estimate.rateLimited)
    }

    @Test func normalizesMaintainAndGainGoalsDeterministically() {
        var draft = OnboardingDraft()
        draft.currentWeightKg = 70
        draft.weightGoal = .maintain
        draft.normalizeGoal()
        #expect(draft.targetWeightKg == 70)
        #expect(draft.weeklyWeightChangePercent == 0)

        draft.weightGoal = .gain
        draft.normalizeGoal()
        #expect(draft.targetWeightKg > 70)
        #expect(draft.weeklyWeightChangePercent == 0.1)
    }

    private func testCalendar() -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .gmt
        return calendar
    }
}
