import SwiftUI

struct DashboardHeader: View {
    let date: Date

    var body: some View {
        VStack(alignment: .leading, spacing: MonsSpacing.large) {
            HStack {
                MonsWordmark()
                Spacer()
                Image(systemName: "bell")
                    .font(MonsTypography.sectionTitle)
                    .foregroundStyle(MonsColor.textPrimary)
                    .frame(width: 44, height: 44)
                    .background(MonsColor.surface, in: .circle)
                    .accessibilityHidden(true)
            }

            Text(date, format: .dateTime.weekday(.wide).day().month(.wide))
                .font(MonsTypography.caption)
                .foregroundStyle(MonsColor.textSecondary)
                .textCase(.uppercase)

            VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                Text("Today")
                    .font(MonsTypography.display)
                Text("Ready to build.")
                    .font(MonsTypography.body)
                    .foregroundStyle(MonsColor.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}
