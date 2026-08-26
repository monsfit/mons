enum MealReviewSheet: Identifiable {
    case edit(PendingFoodLogItem)
    case foodSearch(FoodSearchTarget)

    enum FoodSearchTarget {
        case add
        case replace(PendingFoodLogItem)
        case resolve(String)
    }

    var id: String {
        switch self {
        case .edit(let item): "edit-\(item.id)"
        case .foodSearch(.add): "food-search-add"
        case .foodSearch(.replace(let item)): "food-search-replace-\(item.id)"
        case .foodSearch(.resolve(let name)): "food-search-resolve-\(name)"
        }
    }
}
