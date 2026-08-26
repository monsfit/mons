import SwiftUI

struct WeightStepView: View {
    @Binding var weightKg: Double
    @Binding var system: MeasurementSystem

    var body: some View {
        VStack(spacing: 24) {
            Picker("Weight units", selection: $system) {
                Text("Pounds").tag(MeasurementSystem.imperial)
                Text("Kilograms").tag(MeasurementSystem.metric)
            }
            .pickerStyle(.segmented)

            Picker("Weight", selection: displayedWeight) {
                ForEach(values, id: \.self) { value in
                    Text("\(value) \(unit)").tag(value)
                }
            }
            #if os(iOS)
            .pickerStyle(.wheel)
            #endif
            .labelsHidden()
        }
    }

    private var values: ClosedRange<Int> {
        system == .metric ? 30...300 : 66...660
    }

    private var unit: String {
        system == .metric ? "kg" : "lb"
    }

    private var displayedWeight: Binding<Int> {
        Binding(
            get: {
                system == .metric
                    ? Int(weightKg.rounded())
                    : Int((weightKg * 2.204_622_621_8).rounded())
            },
            set: {
                weightKg = system == .metric ? Double($0) : Double($0) / 2.204_622_621_8
            }
        )
    }
}
