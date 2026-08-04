import SwiftUI

struct WorkoutExerciseSelectionRow: View {
    let exercise: WorkoutExerciseDraft
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: MonsSpacing.medium) {
            Image(systemName: "dumbbell.fill")
                .foregroundStyle(MonsColor.workoutAccent)
                .frame(width: 44, height: 44)
                .background(MonsColor.workoutAccent.opacity(0.1), in: .rect(cornerRadius: MonsRadius.small))
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                Text(exercise.exercise.name)
                    .font(MonsTypography.headline)
                Text("\(exercise.sets.count) sets · \(exercise.exercise.category)")
                    .font(MonsTypography.subheadline)
                    .foregroundStyle(MonsColor.textSecondary)
            }

            Spacer()

            Menu("Exercise actions", systemImage: "ellipsis") {
                Button("Remove exercise", systemImage: "trash", role: .destructive, action: onRemove)
            }
            .labelStyle(.iconOnly)
            .frame(width: 44, height: 44)
        }
        .padding(MonsSpacing.medium)
        .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
        .overlay {
            RoundedRectangle(cornerRadius: MonsRadius.medium)
                .stroke(MonsColor.border, lineWidth: 1)
        }
    }
}
