import Foundation

enum NutritionPlanCalculator {
    static func estimate(
        draft: OnboardingDraft,
        referenceDate: Date = .now,
        calendar: Calendar = .current
    ) -> NutritionPlanEstimate {
        let age = max(calendar.dateComponents([.year], from: draft.birthDate, to: referenceDate).year ?? 18, 18)
        let sexOffset = draft.metabolicSex == .male ? 5.0 : -161.0
        let restingEnergy = 10 * draft.currentWeightKg
            + 6.25 * draft.heightCm
            - 5 * Double(age)
            + sexOffset
        let activityFactor = min(draft.dailyActivity.factor + draft.exerciseFrequency.factor, 2.1)
        let expenditure = Int((restingEnergy * activityFactor).rounded())
        let weeklyChangeKg = draft.currentWeightKg * draft.weeklyWeightChangePercent / 100
        let dailyAdjustment = weeklyChangeKg * 7_700 / 7
        let requestedCalories: Double = switch draft.weightGoal {
        case .lose: Double(expenditure) - dailyAdjustment
        case .maintain: Double(expenditure)
        case .gain: Double(expenditure) + dailyAdjustment
        }
        let weightDifference = abs(draft.targetWeightKg - draft.currentWeightKg)
        let weeks = weeklyChangeKg > 0
            ? (weightDifference / weeklyChangeKg * 10).rounded() / 10
            : nil

        return NutritionPlanEstimate(
            calorieTargetKcal: max(Int(requestedCalories.rounded()), 1_000),
            estimatedExpenditureKcal: expenditure,
            estimatedWeeks: weeks,
            rateLimited: requestedCalories < 1_000,
            restingEnergyKcal: Int(restingEnergy.rounded()),
            weeklyChangeKg: weeklyChangeKg
        )
    }

    static func request(
        draft: OnboardingDraft,
        calendar: Calendar = .current
    ) -> SaveNutritionPlanRequest {
        let components = calendar.dateComponents([.year, .month, .day], from: draft.birthDate)
        let birthDate = String(
            format: "%04d-%02d-%02d",
            components.year ?? 1900,
            components.month ?? 1,
            components.day ?? 1
        )
        return SaveNutritionPlanRequest(
            birthDate: birthDate,
            currentWeightKg: draft.currentWeightKg,
            dailyActivity: draft.dailyActivity,
            exerciseFrequency: draft.exerciseFrequency,
            heightCm: draft.heightCm,
            metabolicSex: draft.metabolicSex,
            targetWeightKg: draft.targetWeightKg,
            weeklyWeightChangePercent: draft.weeklyWeightChangePercent,
            weightGoal: draft.weightGoal
        )
    }
}
