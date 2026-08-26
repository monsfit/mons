import SwiftUI

struct WorkoutExerciseProgressRow: View {
    let exercise: WorkoutExerciseDraft
    let index: Int

    var body: some View {
        HStack(spacing: MonsSpacing.medium) {
            Text(index, format: .number)
                .font(MonsTypography.headline)
                .foregroundStyle(MonsColor.textSecondary)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                Text(exercise.exercise.name)
                    .font(MonsTypography.headline)
                Text("\(exercise.completedSetCount) of \(exercise.sets.count) sets complete")
                    .font(MonsTypography.subheadline)
                    .foregroundStyle(MonsColor.textSecondary)
            }

            Spacer()

            Image(systemName: exercise.completedSetCount == exercise.sets.count ? "checkmark.circle.fill" : "chevron.right")
                .foregroundStyle(exercise.completedSetCount == exercise.sets.count ? MonsColor.workoutAccent : MonsColor.textMuted)
                .accessibilityHidden(true)
        }
        .padding(MonsSpacing.large)
        .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
        .overlay {
            RoundedRectangle(cornerRadius: MonsRadius.medium)
                .stroke(MonsColor.border, lineWidth: 1)
        }
        .accessibilityElement(children: .combine)
        .accessibilityHint("Opens set logging")
    }
}
