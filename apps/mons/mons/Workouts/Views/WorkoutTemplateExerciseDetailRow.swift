import SwiftUI

struct WorkoutTemplateExerciseDetailRow: View {
    let exercise: WorkoutExerciseDraft

    @State private var isExpanded = true

    var body: some View {
        DisclosureGroup(isExpanded: $isExpanded) {
            VStack(alignment: .leading, spacing: MonsSpacing.medium) {
                if !exercise.notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    LabeledContent("Notes", value: exercise.notes)
                        .font(MonsTypography.subheadline)
                }

                ForEach(exercise.sets.enumerated(), id: \.element.id) { index, workoutSet in
                    VStack(spacing: MonsSpacing.small) {
                        LabeledContent("Set \(index + 1)") {
                            Text(
                                "\(workoutSet.weightPounds.formatted(.number.precision(.fractionLength(0...1)))) lb · \(workoutSet.repetitions) reps"
                            )
                        }
                        .font(MonsTypography.body)

                        LabeledContent("Rest") {
                            Text(WorkoutRequestBuilder.formattedRest(workoutSet.restSeconds))
                                .monospacedDigit()
                        }
                        .font(MonsTypography.subheadline)
                        .foregroundStyle(MonsColor.textSecondary)
                    }

                    if workoutSet.id != exercise.sets.last?.id {
                        Divider()
                    }
                }
            }
            .padding(.top, MonsSpacing.medium)
        } label: {
            HStack(spacing: MonsSpacing.medium) {
                Image(systemName: "dumbbell.fill")
                    .foregroundStyle(MonsColor.workoutAccent)
                    .frame(width: 44, height: 44)
                    .background(MonsColor.surfaceRaised, in: .rect(cornerRadius: MonsRadius.small))

                VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                    Text(exercise.exercise.name)
                        .font(MonsTypography.headline)
                    Text("\(exercise.sets.count) sets · \(exercise.exercise.equipment)")
                        .font(MonsTypography.subheadline)
                        .foregroundStyle(MonsColor.textSecondary)
                }
            }
        }
        .tint(MonsColor.textSecondary)
        .padding(MonsSpacing.medium)
        .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
        .overlay {
            RoundedRectangle(cornerRadius: MonsRadius.medium)
                .stroke(MonsColor.border, lineWidth: 1)
        }
    }
}
