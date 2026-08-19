import Testing
@testable import mons

struct FoodSearchControlsTests {
    @Test func scopesHaveStableUserFacingOrder() {
        #expect(FoodSearchScope.allCases.map(\.title) == [
            "All",
            "My Meals",
            "My Recipes",
            "My Foods",
        ])
    }

    @Test func implementedQuickActionsAreAvailableInStableOrder() {
        let availableActions = FoodSearchQuickAction.allCases.filter(\.isAvailable)

        #if os(iOS)
        #expect(availableActions == [.barcodeScan, .voiceLog, .mealScan, .quickAdd])
        #else
        #expect(availableActions == [.barcodeScan, .quickAdd])
        #endif
    }
}
