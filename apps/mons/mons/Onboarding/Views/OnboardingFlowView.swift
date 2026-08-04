import SwiftUI

struct OnboardingFlowView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let onComplete: (OnboardingDraft) async -> Bool

    private let calendar: Calendar
    private let referenceDate: Date

    @State private var draft: OnboardingDraft
    @State private var heightSystem = MeasurementSystem.imperial
    @State private var isSaving = false
    @State private var step = OnboardingStep.metabolism
    @State private var weightSystem = MeasurementSystem.imperial

    private var estimate: NutritionPlanEstimate {
        NutritionPlanCalculator.estimate(
            draft: draft,
            referenceDate: referenceDate,
            calendar: calendar
        )
    }

    private var title: String {
        switch step {
        case .metabolism: "Which energy equation fits you?"
        case .birthdate: "When were you born?"
        case .height: "What is your height?"
        case .weight: "What is your weight?"
        case .exercise: "How often do you exercise?"
        case .activity: "How active are you?"
        case .expenditure: "We estimated your initial expenditure."
        case .goal: "What is your goal?"
        case .targetWeight: "What weight would you like to get to?"
        case .rate: "At what rate?"
        case .complete: ""
        }
    }

    private var subtitle: String {
        switch step {
        case .metabolism: "Mifflin–St Jeor uses one of two resting-energy coefficients."
        case .birthdate: "Age helps estimate resting energy. This planner is for adults."
        case .height: "Height helps estimate your initial daily energy needs."
        case .weight: "For consistency, weigh at roughly the same time each day."
        case .exercise: "Count intentional cardio, sport, and resistance-training sessions."
        case .activity: "Choose movement outside deliberate exercise."
        case .expenditure: "This is the estimated energy needed to maintain your current weight."
        case .goal: "Choose the direction for your initial program."
        case .targetWeight: "You can revise this target at any time."
        case .rate: "Set a desired weekly rate of weight change."
        case .complete: ""
        }
    }

    private var nextTitle: String {
        switch step {
        case .complete: "Create Program"
        case .expenditure: "Looks Right"
        default: "Next"
        }
    }

    private var canContinue: Bool {
        switch step {
        case .targetWeight:
            (draft.weightGoal == .lose && draft.targetWeightKg < draft.currentWeightKg)
                || (draft.weightGoal == .gain && draft.targetWeightKg > draft.currentWeightKg)
        default:
            true
        }
    }

    init(
        referenceDate: Date = .now,
        calendar: Calendar = .current,
        onComplete: @escaping (OnboardingDraft) async -> Bool
    ) {
        self.referenceDate = referenceDate
        self.calendar = calendar
        self.onComplete = onComplete
        _draft = State(initialValue: OnboardingDraft(referenceDate: referenceDate, calendar: calendar))
    }

    var body: some View {
        VStack(spacing: 0) {
            OnboardingProgressBar(
                currentStep: step.rawValue,
                totalSteps: OnboardingStep.allCases.count
            )
            .padding(.horizontal)
            .padding(.top, 12)

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(title)
                            .font(MonsTypography.title)
                        Text(subtitle)
                            .font(MonsTypography.subheadline)
                            .foregroundStyle(MonsColor.textSecondary)
                    }

                    OnboardingStepContent(
                        step: step,
                        estimate: estimate,
                        referenceDate: referenceDate,
                        calendar: calendar,
                        draft: $draft,
                        heightSystem: $heightSystem,
                        weightSystem: $weightSystem
                    )
                }
                .frame(maxWidth: 620, alignment: .leading)
                .padding()
                .padding(.top, 12)
            }
            .scrollIndicators(.hidden)

            OnboardingNavigationControls(
                step: step,
                isSaving: isSaving,
                nextTitle: nextTitle,
                canContinue: canContinue,
                onBack: goBack,
                onNext: goNext
            )
                .padding()
        }
        .background(MonsColor.background)
        .foregroundStyle(MonsColor.textPrimary)
        .animation(reduceMotion ? nil : .snappy, value: step)
    }

    private func goNext() {
        switch step {
        case .goal:
            draft.normalizeGoal()
            step = draft.weightGoal == .maintain ? .complete : .targetWeight
        case .complete:
            isSaving = true
            Task {
                let saved = await onComplete(draft)
                isSaving = false
                if !saved { return }
            }
        default:
            if let next = OnboardingStep(rawValue: step.rawValue + 1) {
                step = next
            }
        }
    }

    private func goBack() {
        if step == .complete, draft.weightGoal == .maintain {
            step = .goal
        } else if let previous = OnboardingStep(rawValue: step.rawValue - 1) {
            step = previous
        }
    }
}
