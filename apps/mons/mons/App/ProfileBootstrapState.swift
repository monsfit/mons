import Foundation

enum ProfileBootstrapState: Equatable, Sendable {
    case loading
    case ready
    case failed(message: String)
}
