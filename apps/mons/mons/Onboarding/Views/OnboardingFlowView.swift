import SwiftUI

struct OnboardingFlowView: View {
    let onComplete: (OnboardingDraft) async -> Bool

    @State private var draft: OnboardingDraft
    @State private var heightSystem = MeasurementSystem.imperial
    @State private var isSaving = false
    @State private var step = OnboardingStep.metabolism
    @State private var weightSystem = MeasurementSystem.imperial

    private let calendar: Calendar
    private let referenceDate: Date

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

                    stepContent
                }
                .frame(maxWidth: 620, alignment: .leading)
                .padding()
                .padding(.top, 12)
            }
            .scrollIndicators(.hidden)

            navigationControls
                .padding()
        }
        .background(MonsColor.background)
        .foregroundStyle(MonsColor.textPrimary)
        .animation(.snappy, value: step)
    }

    @ViewBuilder
    private var stepContent: some View {
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

    private var navigationControls: some View {
        HStack {
            Button("Back", systemImage: "chevron.left", action: goBack)
                .labelStyle(.iconOnly)
                .frame(width: 48, height: 48)
                .foregroundStyle(MonsColor.textWarm)
                .background(MonsColor.surfaceRaised, in: .circle)
                .disabled(step == .metabolism || isSaving)

            Spacer()

            Button(action: goNext) {
                if isSaving {
                    ProgressView()
                        .frame(minWidth: 72)
                } else {
                    Label(nextTitle, systemImage: "chevron.right")
                        .labelStyle(.titleAndIcon)
                }
            }
            .buttonStyle(MonsPrimaryButtonStyle())
            .frame(maxWidth: 220)
            .disabled(!canContinue || isSaving)
        }
    }

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
