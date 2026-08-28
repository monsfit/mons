import SwiftUI

struct CalorieDateHeader: View {
    @Binding var selectedDate: Date

    let maximumDate: Date
    let calendar: Calendar

    var body: some View {
        CalorieDateLens(
            selectedDate: $selectedDate,
            maximumDate: maximumDate,
            calendar: calendar
        )
        .padding(.horizontal, MonsSpacing.large)
        .padding(.bottom, 12)
        .background {
            Rectangle()
                .fill(.ultraThinMaterial)
                .mask {
                    LinearGradient(
                        stops: [
                            .init(color: .black, location: 0),
                            .init(color: .black, location: 0.68),
                            .init(color: .clear, location: 1)
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                }
                .ignoresSafeArea(edges: .top)
        }
    }
}

#Preview {
    @Previewable @State var selectedDate = CalorieSampleData.previewReferenceDate

    CalorieDateHeader(
        selectedDate: $selectedDate,
        maximumDate: CalorieSampleData.previewReferenceDate,
        calendar: .current
    )
}
