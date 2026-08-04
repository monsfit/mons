import SwiftUI

struct WorkoutSetColumnHeader: View {
    var body: some View {
        HStack(spacing: MonsSpacing.small) {
            Color.clear.frame(width: 44)
            Text("Set").frame(width: 32)
            Text("Weight").frame(maxWidth: .infinity)
            Text("Reps").frame(maxWidth: .infinity)
            Text("Rest").frame(width: 72)
        }
        .font(MonsTypography.caption)
        .foregroundStyle(MonsColor.textSecondary)
        .textCase(.uppercase)
        .accessibilityHidden(true)
    }
}
