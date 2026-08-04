import SwiftUI

struct MacroBadge: View {
    let label: String
    let value: Int
    let color: Color

    var body: some View {
        HStack(spacing: 3) {
            Text(label)
                .bold()
                .foregroundStyle(color)

            Text("\(value) g")
                .foregroundStyle(MonsColor.textPrimary)
        }
        .font(MonsTypography.caption)
        .padding(.horizontal, 7)
        .padding(.vertical, 4)
        .background(color.opacity(0.13), in: Capsule())
    }
}
