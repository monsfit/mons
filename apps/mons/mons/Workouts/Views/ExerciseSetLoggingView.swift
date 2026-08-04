import SwiftUI

struct ExerciseSetLoggingView: View {
    @Environment(\.dismiss) private var dismiss

    @Binding var exercise: WorkoutExerciseDraft
    @State private var restEndDate: Date?

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: MonsSpacing.large) {
                VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                    Text(exercise.exercise.name)
                        .font(MonsTypography.display)
                    Text("\(exercise.exercise.category) · \(exercise.exercise.equipment)")
                        .font(MonsTypography.body)
                        .foregroundStyle(MonsColor.textSecondary)
                }

                WorkoutSetColumnHeader()

                ForEach(Array(exercise.sets.enumerated()), id: \.element.id) { index, workoutSet in
                    WorkoutLoggingSetRow(
                        workoutSet: $exercise.sets[index],
                        number: index + 1,
                        onCompleted: startRestTimer,
                        onRemove: { removeSet(workoutSet.id) }
                    )
                }

                Button("Add Set", systemImage: "plus.circle", action: addSet)
                    .font(MonsTypography.headline)
                    .foregroundStyle(MonsColor.workoutAccent)
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .overlay {
                        RoundedRectangle(cornerRadius: MonsRadius.medium)
                            .stroke(MonsColor.workoutAccent, style: StrokeStyle(lineWidth: 1, dash: [5]))
                    }

                WorkoutRestTimerControl(endDate: $restEndDate)

                TextField("Exercise notes", text: $exercise.notes, axis: .vertical)
                    .lineLimit(3...6)
                    .padding(MonsSpacing.large)
                    .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
                    .overlay {
                        RoundedRectangle(cornerRadius: MonsRadius.medium)
                            .stroke(MonsColor.border, lineWidth: 1)
                    }
            }
            .padding(MonsSpacing.large)
            .padding(.bottom, 72)
        }
        .background(MonsColor.background)
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .safeAreaInset(edge: .bottom) {
            Button("Done", systemImage: "checkmark", action: dismiss.callAsFunction)
                .buttonStyle(
                    MonsPrimaryButtonStyle(
                        tint: MonsColor.workoutAccent,
                        foreground: MonsColor.accentForeground
                    )
                )
                .padding(MonsSpacing.large)
                .background(.ultraThinMaterial)
        }
    }

    private func addSet() {
        exercise.addSet()
    }

    private func removeSet(_ identifier: UUID) {
        exercise.removeSet(id: identifier)
    }

    private func startRestTimer(seconds: Int) {
        restEndDate = .now.addingTimeInterval(TimeInterval(seconds))
    }
}
