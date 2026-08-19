import Foundation

nonisolated struct CreateMealEstimateRequest: Encodable, Sendable {
    let dataBase64: String?
    let description: String?
    let estimateId: UUID
    let kind: MealEstimateInputKind
    let mediaType: String?
    let retainMedia: Bool?

    static func text(_ description: String, estimateId: UUID = UUID()) -> Self {
        Self(
            dataBase64: nil,
            description: description,
            estimateId: estimateId,
            kind: .text,
            mediaType: nil,
            retainMedia: nil
        )
    }

    static func photo(
        _ data: Data,
        context: String? = nil,
        estimateId: UUID = UUID(),
        retainMedia: Bool = true
    ) -> Self {
        let normalizedContext = context?.trimmingCharacters(in: .whitespacesAndNewlines)
        return Self(
            dataBase64: data.base64EncodedString(),
            description: normalizedContext?.isEmpty == false ? normalizedContext : nil,
            estimateId: estimateId,
            kind: .photo,
            mediaType: "image/jpeg",
            retainMedia: retainMedia
        )
    }

    static func voice(
        _ data: Data,
        estimateId: UUID = UUID(),
        retainMedia: Bool = false
    ) -> Self {
        Self(
            dataBase64: data.base64EncodedString(),
            description: nil,
            estimateId: estimateId,
            kind: .voice,
            mediaType: "audio/wav",
            retainMedia: retainMedia
        )
    }
}
