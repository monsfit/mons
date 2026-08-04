import SwiftUI

struct MealDragPreview: View {
    let meal: MealEvent

    var body: some View {
        Label(meal.title, systemImage: meal.category.systemImage)
            .font(MonsTypography.headline)
            .padding()
            .glassEffect(.regular, in: .rect(cornerRadius: MonsRadius.medium))
    }
}
