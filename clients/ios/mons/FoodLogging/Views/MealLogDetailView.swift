import SwiftUI

struct MealLogDetailView: View {
    @Environment(AppStore.self) private var store

    let meal: MealLog
    let onChanged: () -> Void

    @State private var isLoaded = false
    @State private var photoData: Data?

    var body: some View {
        Group {
            if isLoaded {
                MealEstimateReviewView(
                    draft: MealReviewDraft(meal: meal, photoData: photoData),
                    isUpdating: true,
                    onLogged: onChanged
                )
            } else {
                ProgressView("Loading meal…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(MonsColor.background)
            }
        }
        .task(id: meal.mealId) {
            if meal.photoAvailable {
                photoData = await store.meals.photo(mealId: meal.mealId)
            }
            isLoaded = true
        }
    }
}
