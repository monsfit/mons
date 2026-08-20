#if DEBUG && os(iOS)
import SwiftUI
import UIKit

struct MealComposerFoodSearchPreviewStage<Content: View>: View {
    private let content: Content
    @State private var isPresented = false

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        ZStack {
            Color(uiColor: .systemBackground)
                .ignoresSafeArea()

            VStack(alignment: .leading, spacing: MonsSpacing.large) {
                Text("Calories")
                    .font(.largeTitle.weight(.semibold))

                LabeledContent("Calories", value: "0 / 1,975")
                LabeledContent("Protein", value: "0 / 123 g")
                LabeledContent("Carbohydrates", value: "0 / 222 g")
                LabeledContent("Fat", value: "0 / 66 g")

                Spacer()

                Button("Open food sheet", systemImage: "chevron.up") {
                    isPresented = true
                }
                .buttonStyle(.glassProminent)
                .frame(maxWidth: .infinity)
            }
            .padding(MonsSpacing.xLarge)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .frame(width: 393, height: 852)
        .sheet(isPresented: $isPresented) {
            content
        }
        .task {
            await Task.yield()
            guard !Task.isCancelled else { return }
            isPresented = true
        }
    }
}
#endif
