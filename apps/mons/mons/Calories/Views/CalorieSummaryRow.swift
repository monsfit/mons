import SwiftUI

struct CalorieSummaryRow: View {
    let day: CalorieDayData

    var body: some View {
        CalorieProgressRing(day: day)
            .frame(maxWidth: .infinity)
    }
}
