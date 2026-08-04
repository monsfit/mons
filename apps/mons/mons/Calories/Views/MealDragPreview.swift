import SwiftUI

struct MealDragPreview: View {
    let meal: MealEvent

    var body: some View {
        Label(meal.title, systemImage: meal.category.systemImage)
            .font(.headline)
            .padding()
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14))
    }
}
