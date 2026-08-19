import Foundation
import Testing
@testable import mons

@MainActor
struct AppToastTests {
    @Test func terminalStatesUseStableDismissalDelays() {
        #expect(AppToast(kind: .success, message: "Saved").dismissalDelay == 2.5)
        #expect(AppToast(kind: .error, message: "Failed").dismissalDelay == 8)
    }

    @Test func staleDismissalCannotRemoveNewerFeedback() throws {
        let oldId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000080"))
        let newId = try #require(UUID(uuidString: "00000000-0000-4000-8000-000000000081"))
        let store = AppStore.preview

        store.showSuccess("First", id: oldId)
        store.showSuccess("Second", id: newId)
        store.dismissToast(oldId)

        #expect(store.toast?.id == newId)
        #expect(store.toast?.message == "Second")
    }
}
