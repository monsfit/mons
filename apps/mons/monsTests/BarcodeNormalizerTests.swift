import Testing
@testable import mons

struct BarcodeNormalizerTests {
    @Test func padsValidUPCAAndEAN13ValuesToGTIN14() {
        #expect(BarcodeNormalizer.gtin14("036000291452") == "00036000291452")
        #expect(BarcodeNormalizer.gtin14("4006381333931") == "04006381333931")
    }

    @Test func acceptsScannerFormattingButRejectsBadCheckDigits() {
        #expect(BarcodeNormalizer.gtin14("0 36000 29145 2") == "00036000291452")
        #expect(BarcodeNormalizer.gtin14("036000291453") == nil)
        #expect(BarcodeNormalizer.gtin14("123") == nil)
    }
}
