import SwiftUI

struct WorkoutTemplateRow: View {
    let template: WorkoutTemplate
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: MonsSpacing.medium) {
                Image(systemName: "list.clipboard.fill")
                    .font(MonsTypography.title)
                    .foregroundStyle(MonsColor.workoutAccent)
                    .frame(width: 52, height: 52)
                    .background(MonsColor.workoutAccent.opacity(0.1), in: .rect(cornerRadius: MonsRadius.small))

                VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                    Text(template.name)
                        .font(MonsTypography.headline)
                    Text("\(template.exerciseIDs.count) exercises")
                        .font(MonsTypography.subheadline)
                        .foregroundStyle(MonsColor.textSecondary)
                }

                Spacer()

                Image(systemName: "plus.circle.fill")
                    .font(MonsTypography.title)
                    .foregroundStyle(MonsColor.workoutAccent)
            }
            .padding(MonsSpacing.medium)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .background(MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
        .overlay {
            RoundedRectangle(cornerRadius: MonsRadius.medium)
                .stroke(MonsColor.border, lineWidth: 1)
        }
        .accessibilityHint("Adds every exercise in this template")
    }
}
