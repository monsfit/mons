import SwiftUI

struct ExercisePickerRow: View {
    let exercise: ExerciseDefinition
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        HStack(spacing: MonsSpacing.medium) {
            Image(systemName: "dumbbell.fill")
                .font(MonsTypography.title)
                .foregroundStyle(MonsColor.workoutAccent)
                .frame(width: 52, height: 52)
                .background(MonsColor.workoutAccent.opacity(0.1), in: .rect(cornerRadius: MonsRadius.small))
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                Text(exercise.name)
                    .font(MonsTypography.headline)

                Text("\(exercise.equipment) · \(exercise.category)")
                    .font(MonsTypography.subheadline)
                    .foregroundStyle(MonsColor.textSecondary)
            }

            Spacer(minLength: MonsSpacing.small)

            Button(isSelected ? "Selected" : "Add", systemImage: isSelected ? "checkmark" : "plus", action: onSelect)
                .labelStyle(.iconOnly)
                .font(MonsTypography.headline)
                .foregroundStyle(isSelected ? MonsColor.accentForeground : MonsColor.workoutAccent)
                .frame(width: 44, height: 44)
                .background(isSelected ? MonsColor.workoutAccent : MonsColor.surfaceRaised, in: .circle)
                .disabled(isSelected)
        }
        .padding(MonsSpacing.medium)
        .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
        .overlay {
            RoundedRectangle(cornerRadius: MonsRadius.medium)
                .stroke(MonsColor.border, lineWidth: 1)
        }
        .accessibilityElement(children: .contain)
    }
}
