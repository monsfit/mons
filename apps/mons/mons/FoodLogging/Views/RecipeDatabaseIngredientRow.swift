import SwiftUI

struct RecipeDatabaseIngredientRow: View {
    let name: String
    let amount: String

    var body: some View {
        HStack {
            Text(name)
            Spacer()
            Text(amount)
                .foregroundStyle(MonsColor.textSecondary)
                .monospacedDigit()
        }
        .font(MonsTypography.body)
        .frame(minHeight: 48)
    }
}
