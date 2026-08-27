import Foundation

enum MealPhotoAnalysisPhase {
    case capture
    case context(Data)
    case analyzing(Data)
    case failed(Data, String)
    case review(Data, MealEstimate)
}
