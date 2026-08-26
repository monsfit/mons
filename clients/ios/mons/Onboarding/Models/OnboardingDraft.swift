import Foundation

struct OnboardingDraft: Equatable {
    var birthDate: Date
    var currentWeightKg = 68.0
    var dailyActivity = DailyActivity.mostlySedentary
    var exerciseFrequency = ExerciseFrequency.none
    var heightCm = 170.0
    var metabolicSex = MetabolicSex.female
    var targetWeightKg = 62.0
    var weeklyWeightChangePercent = 0.5
    var weightGoal = WeightGoal.lose

    init(referenceDate: Date = .now, calendar: Calendar = .current) {
        birthDate = calendar.date(byAdding: .year, value: -30, to: referenceDate)
            ?? referenceDate
    }

    mutating func normalizeGoal() {
        switch weightGoal {
        case .lose:
            targetWeightKg = min(targetWeightKg, currentWeightKg - 0.5)
            weeklyWeightChangePercent = max(weeklyWeightChangePercent, 0.1)
        case .maintain:
            targetWeightKg = currentWeightKg
            weeklyWeightChangePercent = 0
        case .gain:
            targetWeightKg = max(targetWeightKg, currentWeightKg + 0.5)
            weeklyWeightChangePercent = max(weeklyWeightChangePercent, 0.1)
        }
    }
}
