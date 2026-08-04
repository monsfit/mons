import SwiftUI

struct MacroMetricView: View {
    let title: String
    let grams: Int

    var body: some View {
        VStack(alignment: .leading) {
            Text(title)
                .foregroundStyle(MonsColor.textSecondary)
            Text("\(grams.formatted()) g")
                .font(MonsTypography.headline)
        }
    }
}
