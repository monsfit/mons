import SwiftUI

struct SavedWorkoutTemplateRow: View {
    let isDeleting: Bool
    let template: SavedWorkoutTemplate
    let onPrepare: () -> Void
    let onSelect: () -> Void

    var body: some View {
        HStack(spacing: MonsSpacing.medium) {
            Button(action: onSelect) {
                HStack(spacing: MonsSpacing.medium) {
                    Image(systemName: "list.bullet.rectangle.portrait")
                        .font(MonsTypography.title)
                        .foregroundStyle(MonsColor.workoutAccent)
                        .frame(width: 36)

                    VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                        Text(template.name)
                            .font(MonsTypography.headline)
                        Text("\(template.exercises.count) exercises · \(setCount) sets")
                            .font(MonsTypography.subheadline)
                            .foregroundStyle(MonsColor.textSecondary)
                    }

                    Spacer()
                }
                .contentShape(.rect)
            }
            .buttonStyle(.plain)

            Button("Prepare \(template.name)", systemImage: "play.fill", action: onPrepare)
                .labelStyle(.iconOnly)
                .frame(width: 44, height: 44)
                .background(MonsColor.surfaceRaised, in: .circle)

            if isDeleting {
                ProgressView()
                    .controlSize(.small)
                    .frame(width: 44, height: 44)
                    .accessibilityLabel("Deleting template")
            } else {
                Image(systemName: "chevron.forward")
                    .foregroundStyle(.tertiary)
                    .accessibilityHidden(true)
                    .frame(width: 44, height: 44)
            }
        }
        .contextMenu {
            Button("Prepare Workout", systemImage: "play.fill", action: onPrepare)
        }
    }

    private var setCount: Int {
        template.exercises.reduce(0) { $0 + $1.sets.count }
    }
}
