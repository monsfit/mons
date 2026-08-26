import Foundation
import Testing
@testable import mons

struct MealEstimateModelsTests {
    @Test func textRequestOmitsMediaFields() throws {
        let estimateId = UUID(uuidString: "00000000-0000-4000-8000-000000000101") ?? UUID()
        let data = try JSONEncoder().encode(
            CreateMealEstimateRequest.text("Two eggs and toast", estimateId: estimateId)
        )
        let value = try JSONDecoder().decode(TextRequestFixture.self, from: data)

        #expect(value.description == "Two eggs and toast")
        #expect(value.estimateId == estimateId)
        #expect(value.kind == .text)
    }

    @Test func photoRequestIncludesTrimmedContext() throws {
        let estimateId = UUID(uuidString: "00000000-0000-4000-8000-000000000102") ?? UUID()
        let data = try JSONEncoder().encode(
            CreateMealEstimateRequest.photo(
                Data([1, 2, 3]),
                context: "  Coffee with milk and honey  ",
                estimateId: estimateId
            )
        )
        let value = try JSONDecoder().decode(PhotoRequestFixture.self, from: data)

        #expect(value.dataBase64 == "AQID")
        #expect(value.description == "Coffee with milk and honey")
        #expect(value.estimateId == estimateId)
        #expect(value.kind == .photo)
    }

    @Test func voiceRequestUsesPortableLinearPCMAudio() throws {
        let estimateId = UUID(uuidString: "00000000-0000-4000-8000-000000000103") ?? UUID()
        let data = try JSONEncoder().encode(
            CreateMealEstimateRequest.voice(Data([1, 2, 3]), estimateId: estimateId)
        )
        let value = try JSONDecoder().decode(VoiceRequestFixture.self, from: data)

        #expect(value.dataBase64 == "AQID")
        #expect(value.estimateId == estimateId)
        #expect(value.kind == .voice)
        #expect(value.mediaType == "audio/wav")
    }

    @Test func resolvedItemProducesDeterministicPerHundredGramNutrition() throws {
        let item = MealEstimateItem(
            amountGrams: 50,
            calories: 90,
            carbohydrates: 1,
            confidence: 0.9,
            description: "one egg",
            evidence: "catalog match",
            foodId: "123",
            name: "Fried egg",
            ordinal: 0,
            protein: 6,
            resolved: true,
            sourceKind: .raw,
            totalFat: 7
        )
        let food = try #require(item.catalogFood)

        #expect(food.calories == 180)
        #expect(food.protein == 12)
        #expect(food.totalFat == 14)
        #expect(item.pendingLogItem(loggedAt: .distantPast)?.quantityGrams == 50)
    }

    @Test func unresolvedItemCannotBecomeALogEntry() {
        let item = MealEstimateItem(
            amountGrams: 100,
            calories: 0,
            carbohydrates: 0,
            confidence: 0.2,
            description: "unknown sauce",
            evidence: "no catalog candidate",
            foodId: nil,
            name: "Unknown sauce",
            ordinal: 1,
            protein: 0,
            resolved: false,
            sourceKind: nil,
            totalFat: 0
        )

        #expect(item.catalogFood == nil)
        #expect(item.pendingLogItem(loggedAt: .distantPast) == nil)
    }
}

private struct TextRequestFixture: Decodable {
    let description: String
    let estimateId: UUID
    let kind: MealEstimateInputKind
}

private struct PhotoRequestFixture: Decodable {
    let dataBase64: String
    let description: String
    let estimateId: UUID
    let kind: MealEstimateInputKind
}

private struct VoiceRequestFixture: Decodable {
    let dataBase64: String
    let estimateId: UUID
    let kind: MealEstimateInputKind
    let mediaType: String
}
