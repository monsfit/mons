import SwiftUI

struct PreparedWorkoutAccessory: View {
    let isExpanded: Bool
    let template: SavedWorkoutTemplate
    let onStart: () -> Void

    var body: some View {
        HStack(spacing: MonsSpacing.medium) {
            Image(systemName: "dumbbell.fill")
                .font(MonsTypography.headline)
                .foregroundStyle(MonsColor.textPrimary)
                .frame(width: 36, height: 36)
                .accessibilityHidden(true)

            if isExpanded {
                VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                    Text(template.name)
                        .font(MonsTypography.headline)
                        .lineLimit(1)

                    Text("\(template.exercises.count) exercises")
                        .font(MonsTypography.caption)
                        .foregroundStyle(MonsColor.textSecondary)
                }
            }

            Spacer(minLength: MonsSpacing.small)

            Button("Start workout", systemImage: "play.fill", action: onStart)
                .labelStyle(.iconOnly)
                .font(MonsTypography.headline)
                .foregroundStyle(MonsColor.actionForeground)
                .frame(width: 44, height: 44)
                .background(MonsColor.action, in: .circle)
        }
        .padding(.horizontal, MonsSpacing.medium)
        .frame(minHeight: 56)
        .accessibilityElement(children: .contain)
    }
}

#Preview("Prepared workout accessory") {
    PreparedWorkoutAccessory(
        isExpanded: true,
        template: SavedWorkoutTemplate(id: UUID(), name: "Summit Push", exercises: []),
        onStart: {}
    )
    .padding()
    .background(MonsColor.background)
}
