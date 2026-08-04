import SwiftUI

struct WorkoutLoggingSetRow: View {
    @Binding var workoutSet: WorkoutLoggingSet

    let number: Int
    let onCompleted: (Int) -> Void

    var body: some View {
        HStack(spacing: MonsSpacing.small) {
            Button(workoutSet.isCompleted ? "Mark set incomplete" : "Complete set", systemImage: completionImage, action: toggle)
                .labelStyle(.iconOnly)
                .font(MonsTypography.title)
                .foregroundStyle(workoutSet.isCompleted ? MonsColor.accentForeground : MonsColor.textMuted)
                .frame(width: 44, height: 44)
                .background(workoutSet.isCompleted ? MonsColor.workoutAccent : MonsColor.surfaceRaised, in: .circle)

            Text(number, format: .number)
                .font(MonsTypography.headline)
                .frame(width: 32)

            TextField("Weight", value: $workoutSet.weightPounds, format: .number.precision(.fractionLength(0...1)))
                #if os(iOS)
                .keyboardType(.decimalPad)
                #endif
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(MonsColor.surfaceRaised, in: .rect(cornerRadius: MonsRadius.small))
                .accessibilityLabel("Set \(number) weight in pounds")

            TextField("Reps", value: $workoutSet.repetitions, format: .number)
                #if os(iOS)
                .keyboardType(.numberPad)
                #endif
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(MonsColor.surfaceRaised, in: .rect(cornerRadius: MonsRadius.small))
                .accessibilityLabel("Set \(number) repetitions")

            Menu {
                ForEach([60, 90, 120, 150, 180], id: \.self) { seconds in
                    Button(WorkoutRequestBuilder.formattedRest(seconds)) {
                        workoutSet.restSeconds = seconds
                    }
                }
            } label: {
                Text(WorkoutRequestBuilder.formattedRest(workoutSet.restSeconds))
                    .font(MonsTypography.subheadline)
                    .monospacedDigit()
                    .frame(width: 72, height: 44)
                    .background(MonsColor.surfaceRaised, in: .rect(cornerRadius: MonsRadius.small))
            }
            .accessibilityLabel("Set \(number) rest time")
        }
        .padding(MonsSpacing.medium)
        .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
        .overlay {
            RoundedRectangle(cornerRadius: MonsRadius.medium)
                .stroke(workoutSet.isCompleted ? MonsColor.workoutAccent : MonsColor.border, lineWidth: 1)
        }
    }

    private var completionImage: String {
        workoutSet.isCompleted ? "checkmark" : "circle"
    }

    private func toggle() {
        workoutSet.isCompleted.toggle()
        if workoutSet.isCompleted {
            onCompleted(workoutSet.restSeconds)
        }
    }
}
