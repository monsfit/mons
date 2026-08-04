import SwiftUI

struct TimelineMarkerView: View {
    let isLast: Bool

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: "circle.fill")
                .font(MonsTypography.caption)
                .foregroundStyle(MonsColor.action)

            if !isLast {
                Rectangle()
                    .fill(MonsColor.border)
                    .frame(width: 2)
                    .frame(maxHeight: .infinity)
            }
        }
        .frame(minWidth: 20, maxHeight: .infinity)
        .accessibilityHidden(true)
    }
}
