import Foundation

struct WorkoutDraftSet: Identifiable {
    let id: UUID
    var detail: String
    var title: String
    var value: String

    init(id: UUID = UUID(), detail: String = "", title: String = "", value: String = "") {
        self.id = id
        self.detail = detail
        self.title = title
        self.value = value
    }
}
