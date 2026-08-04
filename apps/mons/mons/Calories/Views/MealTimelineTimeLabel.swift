import SwiftUI

struct MealTimelineTimeLabel: View {
    let date: Date

    var body: some View {
        Text(date, format: .dateTime.hour().minute())
            .font(MonsTypography.subheadline)
            .foregroundStyle(MonsColor.textSecondary)
            .monospacedDigit()
            .lineLimit(1)
            .fixedSize(horizontal: true, vertical: false)
            .padding(.horizontal, MonsSpacing.xSmall)
            .background(MonsColor.background)
    }
}
