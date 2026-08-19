import Foundation

enum BarcodeNormalizer {
    static func gtin14(_ value: String) -> String? {
        let digits = value.filter(\.isNumber)
        guard [8, 12, 13, 14].contains(digits.count) else { return nil }
        let normalized = String(repeating: "0", count: 14 - digits.count) + digits
        guard isValidCheckDigit(normalized) else { return nil }
        return normalized
    }

    private static func isValidCheckDigit(_ gtin: String) -> Bool {
        let digits = gtin.compactMap(\.wholeNumberValue)
        guard digits.count == 14, let checkDigit = digits.last else { return false }
        let sum = digits.dropLast().enumerated().reduce(0) { result, item in
            result + item.element * (item.offset.isMultiple(of: 2) ? 3 : 1)
        }
        return (10 - sum % 10) % 10 == checkDigit
    }
}
