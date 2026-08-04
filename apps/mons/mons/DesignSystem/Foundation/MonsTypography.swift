import SwiftUI

enum MonsTypography {
    static let display = Font.custom("SpaceGrotesk-Bold", size: 34, relativeTo: .largeTitle)
    static let title = Font.custom("SpaceGrotesk-Bold", size: 24, relativeTo: .title2)
    static let sectionTitle = Font.custom("SpaceGrotesk-Medium", size: 20, relativeTo: .title3)
    static let metric = Font.custom("SpaceGrotesk-Medium", size: 32, relativeTo: .title)
    static let headline = Font.custom("SpaceGrotesk-Medium", size: 17, relativeTo: .headline)
    static let body = Font.custom("SpaceGrotesk-Regular", size: 17, relativeTo: .body)
    static let subheadline = Font.custom("SpaceGrotesk-Regular", size: 15, relativeTo: .subheadline)
    static let caption = Font.custom("SpaceGrotesk-Medium", size: 13, relativeTo: .caption)
    static let smallCaption = Font.custom("SpaceGrotesk-Regular", size: 11, relativeTo: .caption2)
}
