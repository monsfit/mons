import Foundation

struct AppToast: Equatable, Identifiable, Sendable {
    let id: UUID
    let kind: AppToastKind
    let message: String

    init(id: UUID = UUID(), kind: AppToastKind, message: String) {
        self.id = id
        self.kind = kind
        self.message = message
    }

    var dismissalDelay: TimeInterval? {
        switch kind {
        case .success:
            2.5
        case .error:
            8
        }
    }
}
