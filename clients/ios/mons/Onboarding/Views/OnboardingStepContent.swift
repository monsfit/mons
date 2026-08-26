import SwiftUI

struct OnboardingStepContent: View {
    let step: OnboardingStep
    let estimate: NutritionPlanEstimate
    let referenceDate: Date
    let calendar: Calendar

    @Binding var draft: OnboardingDraft
    @Binding var heightSystem: MeasurementSystem
    @Binding var weightSystem: MeasurementSystem

    var body: some View {
        switch step {
        case .metabolism:
            MetabolismStepView(selection: $draft.metabolicSex)
        case .birthdate:
            BirthdateStepView(
                birthDate: $draft.birthDate,
                referenceDate: referenceDate,
                calendar: calendar
            )
        case .height:
            HeightStepView(heightCm: $draft.heightCm, system: $heightSystem)
        case .weight:
            WeightStepView(weightKg: $draft.currentWeightKg, system: $weightSystem)
        case .exercise:
            ExerciseStepView(selection: $draft.exerciseFrequency)
        case .activity:
            ActivityStepView(selection: $draft.dailyActivity)
        case .expenditure:
            ExpenditureStepView(estimate: estimate)
        case .goal:
            GoalStepView(selection: $draft.weightGoal)
        case .targetWeight:
            WeightStepView(weightKg: $draft.targetWeightKg, system: $weightSystem)
        case .rate:
            RateStepView(
                rate: $draft.weeklyWeightChangePercent,
                goal: draft.weightGoal,
                estimate: estimate
            )
        case .complete:
            CompletionStepView(estimate: estimate, goal: draft.weightGoal)
        }
    }
}
