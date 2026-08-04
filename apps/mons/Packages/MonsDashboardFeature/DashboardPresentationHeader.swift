import MonsDesignSystem
import SwiftUI

struct DashboardPresentationHeader<AccountMenu: View>: View {
    let date: Date
    let accountMenu: AccountMenu

    var body: some View {
        VStack(alignment: .leading, spacing: MonsSpacing.large) {
            HStack {
                MonsWordmark()
                Spacer()
                accountMenu.frame(width: 44, height: 44)
            }

            Text(date, format: .dateTime.weekday(.wide).day().month(.wide))
                .font(MonsTypography.caption)
                .foregroundStyle(MonsColor.textSecondary)
                .textCase(.uppercase)

            VStack(alignment: .leading, spacing: MonsSpacing.xSmall) {
                Text("Today").font(MonsTypography.display)
                Text("Ready to build.")
                    .font(MonsTypography.body)
                    .foregroundStyle(MonsColor.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
