import SwiftUI

struct OnboardingChoiceCard: View {
    let title: String
    let detail: String?
    let systemImage: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Image(systemName: systemImage)
                    .foregroundStyle(isSelected ? MonsColor.action : MonsColor.textSecondary)
                    .frame(width: 24)
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(MonsTypography.headline)
                    if let detail {
                        Text(detail)
                            .font(MonsTypography.caption)
                            .foregroundStyle(MonsColor.textSecondary)
                    }
                }

                Spacer(minLength: 8)

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isSelected ? MonsColor.action : MonsColor.textMuted)
                    .accessibilityHidden(true)
            }
            .foregroundStyle(MonsColor.textPrimary)
            .multilineTextAlignment(.leading)
            .padding(16)
            .frame(maxWidth: .infinity, minHeight: 72, alignment: .leading)
            .background(isSelected ? MonsPalette.ember900.opacity(0.42) : MonsColor.surface, in: .rect(cornerRadius: MonsRadius.medium))
            .overlay {
                RoundedRectangle(cornerRadius: MonsRadius.medium)
                    .stroke(isSelected ? MonsColor.action : MonsColor.border, lineWidth: isSelected ? 2 : 1)
            }
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}
