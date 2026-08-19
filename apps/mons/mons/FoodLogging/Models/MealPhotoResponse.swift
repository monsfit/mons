import Foundation

nonisolated struct MealPhotoResponse: Decodable, Sendable {
    let dataBase64: String
    let mediaType: String

    var data: Data? { Data(base64Encoded: dataBase64) }
}
