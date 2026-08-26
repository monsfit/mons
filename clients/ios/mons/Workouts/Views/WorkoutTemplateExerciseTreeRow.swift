import SwiftUI

struct WorkoutTemplateExerciseTreeRow: View {
    @Binding var exercise: WorkoutExerciseDraft

    @State private var isExpanded = true

    let onRemove: () -> Void

    var body: some View {
        DisclosureGroup(isExpanded: $isExpanded) {
            VStack(spacing: MonsSpacing.small) {
                HStack {
                    Text("Set")
                        .frame(width: 28)
                    Text("Weight")
                        .frame(maxWidth: .infinity)
                    Text("Reps")
                        .frame(maxWidth: .infinity)
                    Text("Rest")
                        .frame(width: 62)
                    Color.clear.frame(width: 44)
                }
                .font(MonsTypography.caption)
                .foregroundStyle(MonsColor.textMuted)

                ForEach(Array(exercise.sets.indices), id: \.self) { index in
                    WorkoutTemplateSetEditorRow(
                        workoutSet: $exercise.sets[index],
                        canRemove: exercise.sets.count > 1,
                        number: index + 1,
                        onRemove: { removeSet(at: index) }
                    )
                }

                Button("Add Set", systemImage: "plus.circle") {
                    exercise.addSet()
                }
                    .font(MonsTypography.headline)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .foregroundStyle(MonsColor.workoutAccent)
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
  
                Spacer()

                Menu("Exercise actions", systemImage: "ellipsis") {
                    Button("Remove Exercise", systemImage: "trash", role: .destructive, action: onRemove)
                }
                .labelStyle(.iconOnly)
                .frame(width: 44, height: 44)
            }
            .contentShape(.rect)
        }
        .tint(MonsColor.textSecondary)
        .padding(MonsSpacing.medium)
        .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
        .overlay {
            RoundedRectangle(cornerRadius: MonsRadius.medium)
                .stroke(MonsColor.border, lineWidth: 1)
        }
    }

    private func removeSet(at index: Int) {
        guard exercise.sets.count > 1, exercise.sets.indices.contains(index) else { return }
        exercise.sets.remove(at: index)
    }
}
