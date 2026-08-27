import SwiftUI

struct WeekCalorieStrip: View {
    @Binding var selectedDate: Date

    let maximumDate: Date
    let days: [CalorieDayData]
    let calendar: Calendar

    private var visibleDates: [Date] {
        let selectedDay = calendar.startOfDay(for: selectedDate)
        let maximumDay = calendar.startOfDay(for: maximumDate)
        let defaultStart = calendar.date(byAdding: .year, value: -1, to: maximumDay) ?? selectedDay
        let selectedStart = calendar.date(byAdding: .month, value: -1, to: selectedDay) ?? selectedDay
        let start = min(defaultStart, selectedStart)
        let end = calendar.date(byAdding: .day, value: 6, to: maximumDay) ?? maximumDay
        let dayCount = calendar.dateComponents([.day], from: start, to: end).day ?? 0

        return (0...max(dayCount, 0)).compactMap {
            calendar.date(byAdding: .day, value: $0, to: start)
        }
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal) {
                GlassEffectContainer(spacing: 8) {
                    LazyHStack(spacing: 8) {
                        ForEach(visibleDates, id: \.self) { date in
                            WeekDayProgressButton(
                                date: date,
                                day: dayData(for: date),
                                selectedDate: $selectedDate,
                                maximumDate: maximumDate,
                                calendar: calendar
                            )
                            .containerRelativeFrame(.horizontal, count: 7, spacing: 8)
                            .id(calendar.startOfDay(for: date))
                        }
                    }
                    .scrollTargetLayout()
                }
            }
            .contentMargins(.horizontal, 8, for: .scrollContent)
            .contentMargins(.vertical, 10, for: .scrollContent)
            .scrollIndicators(.hidden)
            .scrollClipDisabled()
            .scrollTargetBehavior(.viewAligned)
            .defaultScrollAnchor(.center)
            .frame(height: 74)
            .mask {
                LinearGradient(
                    stops: [
                        .init(color: .clear, location: 0),
                        .init(color: .black, location: 0.045),
                        .init(color: .black, location: 0.955),
                        .init(color: .clear, location: 1)
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            }
            .task {
                await Task.yield()
                proxy.scrollTo(calendar.startOfDay(for: selectedDate), anchor: .center)
            }
            .onChange(of: selectedDate) { _, date in
                withAnimation(.smooth) {
                    proxy.scrollTo(calendar.startOfDay(for: date), anchor: .center)
                }
            }
        }
        .accessibilityElement(children: .contain)
    }

    private func dayData(for date: Date) -> CalorieDayData {
        days.first { calendar.isDate($0.date, inSameDayAs: date) }
            ?? .empty(on: date)
    }
}
