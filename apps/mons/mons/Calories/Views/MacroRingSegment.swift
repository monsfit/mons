import SwiftUI

struct MacroRingSegment: View {
    let start: Double
    let progress: Double
    let color: Color
    let lineWidth: Double

    var body: some View {
        ZStack {
            Circle()
                .trim(from: start, to: start + 0.30)
                .stroke(color.opacity(0.18), style: StrokeStyle(lineWidth: lineWidth, lineCap: .butt))

            Circle()
                .trim(from: start, to: start + (0.30 * progress))
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .butt))
        }
    }
}
