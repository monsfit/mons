import SwiftUI

struct WorkoutTemplateSetEditorRow: View {
    @Binding var workoutSet: WorkoutLoggingSet

    let canRemove: Bool
    let number: Int
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: MonsSpacing.small) {
            Text(number, format: .number)
                .font(MonsTypography.headline)
                .foregroundStyle(MonsColor.textSecondary)
                .frame(width: 28)

            TextField(
                "Weight",
                value: $workoutSet.weightPounds,
                format: .number.precision(.fractionLength(0...1))
            )
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
                ForEach([30, 60, 90, 120, 150, 180, 240], id: \.self) { seconds in
                    Button(WorkoutRequestBuilder.formattedRest(seconds)) {
                        workoutSet.restSeconds = seconds
                    }
                }
            } label: {
                Text(WorkoutRequestBuilder.formattedRest(workoutSet.restSeconds))
                    .font(MonsTypography.subheadline)
                    .monospacedDigit()
                    .frame(width: 62, height: 44)
                    .background(MonsColor.surfaceRaised, in: .rect(cornerRadius: MonsRadius.small))
            }
            .accessibilityLabel("Set \(number) rest time")

            Button("Remove set \(number)", systemImage: "minus.circle", role: .destructive, action: onRemove)
                .labelStyle(.iconOnly)
                .font(MonsTypography.title)
                .foregroundStyle(canRemove ? MonsColor.error : MonsColor.textMuted)
                .frame(width: 44, height: 44)
                .disabled(!canRemove)
        }
    }
}

#Preview {
    @Previewable @State var workoutSet = WorkoutLoggingSet(weightPounds: 135, repetitions: 8, restSeconds: 90)
    WorkoutTemplateSetEditorRow(
        workoutSet: $workoutSet,
        canRemove: true,
        number: 1,
        onRemove: {}
    )
    .padding()
    .background(MonsColor.background)
}
