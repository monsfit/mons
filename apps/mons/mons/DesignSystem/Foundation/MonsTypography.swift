import SwiftUI

public enum MonsTypography {
    public static let display = Font.custom("SpaceGrotesk-Bold", size: 34, relativeTo: .largeTitle)
    public static let title = Font.custom("SpaceGrotesk-Bold", size: 24, relativeTo: .title2)
    public static let sectionTitle = Font.custom("SpaceGrotesk-Medium", size: 20, relativeTo: .title3)
    public static let metric = Font.custom("SpaceGrotesk-Medium", size: 32, relativeTo: .title)
    public static let headline = Font.custom("SpaceGrotesk-Medium", size: 17, relativeTo: .headline)
    public static let body = Font.custom("SpaceGrotesk-Regular", size: 17, relativeTo: .body)
    public static let subheadline = Font.custom("SpaceGrotesk-Regular", size: 15, relativeTo: .subheadline)
    public static let caption = Font.custom("SpaceGrotesk-Medium", size: 13, relativeTo: .caption)
}
