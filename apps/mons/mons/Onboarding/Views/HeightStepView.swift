import SwiftUI

struct HeightStepView: View {
    @Binding var heightCm: Double
    @Binding var system: MeasurementSystem

    var body: some View {
        VStack(spacing: 24) {
            Picker("Height units", selection: $system) {
                Text("Feet and Inches").tag(MeasurementSystem.imperial)
                Text("Centimeters").tag(MeasurementSystem.metric)
            }
            .pickerStyle(.segmented)

            if system == .metric {
                Picker("Height", selection: metricHeight) {
                    ForEach(120...220, id: \.self) { value in
                        Text("\(value) cm").tag(value)
                    }
                }
                #if os(iOS)
                .pickerStyle(.wheel)
                #endif
                .labelsHidden()
            } else {
                HStack {
                    Picker("Feet", selection: feet) {
                        ForEach(4...7, id: \.self) { value in
                            Text("\(value) ft").tag(value)
                        }
                    }
                    Picker("Inches", selection: inches) {
                        ForEach(0...11, id: \.self) { value in
                            Text("\(value) in").tag(value)
                        }
                    }
                }
                #if os(iOS)
                .pickerStyle(.wheel)
                #endif
                .labelsHidden()
            }
        }
    }

    private var metricHeight: Binding<Int> {
        Binding(
            get: { Int(heightCm.rounded()) },
            set: { heightCm = Double($0) }
        )
    }

    private var feet: Binding<Int> {
        Binding(
            get: { max(Int(heightCm / 2.54) / 12, 4) },
            set: { heightCm = Double($0 * 12 + inches.wrappedValue) * 2.54 }
        )
    }

    private var inches: Binding<Int> {
        Binding(
            get: { max(Int((heightCm / 2.54).rounded()) % 12, 0) },
            set: { heightCm = Double(feet.wrappedValue * 12 + $0) * 2.54 }
        )
    }
}
