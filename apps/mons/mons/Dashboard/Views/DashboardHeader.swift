import SwiftUI

struct DashboardHeader: View {
    let date: Date

    var body: some View {
        VStack(alignment: .leading) {
            Text(date, format: .dateTime.weekday(.wide).day().month(.wide))
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
            Text("Dashboard")
                .font(.largeTitle)
                .bold()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}
