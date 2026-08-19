import SwiftUI

struct FoodIngredientAmountControls: View {
    @Binding var amount: Double
    @Binding var selectedPortion: FoodPortion?

    let portions: [FoodPortion]
    let quantityGrams: Double

    var body: some View {
        FoodServingEditor(
            amount: $amount,
            selectedPortion: $selectedPortion,
            portions: portions,
            quantityGrams: quantityGrams
        )
    }
}
