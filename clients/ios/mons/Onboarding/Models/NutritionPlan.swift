import Foundation

nonisolated struct NutritionPlan: Codable, Equatable, Sendable {
    let birthDate: String
    let calculatedAt: Date
    let calorieTargetKcal: Int
    let currentWeightKg: Double
    let dailyActivity: DailyActivity
    let estimatedExpenditureKcal: Int
    let estimatedWeeks: Double?
    let exerciseFrequency: ExerciseFrequency
    let heightCm: Double
    let metabolicSex: MetabolicSex
    let rateLimited: Bool
    let restingEnergyKcal: Int
    let targetWeightKg: Double
    let weeklyWeightChangePercent: Double
    let weightGoal: WeightGoal

    static let preview = NutritionPlan(
        birthDate: "1998-02-18",
        calculatedAt: Date(timeIntervalSince1970: 1_775_563_200),
        calorieTargetKcal: 2_200,
        currentWeightKg: 68,
        dailyActivity: .moderatelyActive,
        estimatedExpenditureKcal: 2_450,
        estimatedWeeks: 17.6,
        exerciseFrequency: .oneToThree,
        heightCm: 170,
        metabolicSex: .female,
        rateLimited: false,
        restingEnergyKcal: 1_450,
        targetWeightKg: 62,
        weeklyWeightChangePercent: 0.5,
        weightGoal: .lose
    )
}
