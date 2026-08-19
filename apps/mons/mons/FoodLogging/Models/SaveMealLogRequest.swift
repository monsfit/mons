import Foundation

nonisolated struct SaveMealLogRequest: Encodable, Sendable {
    let description: String
    let estimateId: UUID?
    let items: [MealLogItemInput]
    let loggedAt: Date
    let mealCategory: MealCategory
    let mealId: UUID
    let photoDataBase64: String?
    let photoMediaType: String?

    init(draft: MealReviewDraft, includePhoto: Bool = true) {
        description = draft.description.trimmingCharacters(in: .whitespacesAndNewlines)
        estimateId = draft.estimateId
        items = draft.items.map(MealLogItemInput.init)
        loggedAt = draft.loggedAt
        mealCategory = draft.mealCategory
        mealId = draft.mealId
        photoDataBase64 = includePhoto ? draft.photoData?.base64EncodedString() : nil
        photoMediaType = includePhoto && draft.photoData != nil ? "image/jpeg" : nil
    }
}
