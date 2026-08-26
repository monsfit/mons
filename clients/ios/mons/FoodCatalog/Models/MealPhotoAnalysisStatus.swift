enum MealPhotoAnalysisStatus: Equatable {
    case ready
    case analyzing
    case failed(String)
}
