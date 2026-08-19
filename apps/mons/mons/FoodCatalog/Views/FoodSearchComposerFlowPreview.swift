#if DEBUG && os(iOS)
import PhotosUI
import SwiftUI

struct FoodSearchComposerFlowPreview: View {
    @Namespace private var cameraTransitionNamespace
    @State private var destination: Destination?
    @State private var isMenuExpanded = false
    @State private var searchText = ""
    @State private var selectedPhoto: PhotosPickerItem?

    var body: some View {
        NavigationStack {
            List {
                Section("Recent") {
                    Label("Greek yogurt and berries", systemImage: "fork.knife")
                    Label("Chicken rice bowl", systemImage: "fork.knife")
                    Label("Protein shake", systemImage: "fork.knife")
                }
            }
            .navigationTitle("Calories")
            .safeAreaInset(edge: .bottom, spacing: 0) {
                Color.clear.frame(height: 76)
            }
            .overlay(alignment: .bottom) {
                FoodSearchComposer(
                    searchText: $searchText,
                    selectedPhoto: $selectedPhoto,
                    isMenuExpanded: $isMenuExpanded,
                    cameraTransitionNamespace: cameraTransitionNamespace,
                    isCameraPresented: destination != nil,
                    onBarcode: { destination = .barcode },
                    onCamera: { destination = .meal },
                    onPaste: {},
                    onVoiceCapture: { _ in },
                    cameraContent: {
                        if let destination {
                            cameraCard(for: destination)
                        }
                    }
                )
            }
        }
    }

    private func cameraCard(for destination: Destination) -> some View {
        ZStack {
            Color.black

            Image(systemName: destination == .barcode ? "barcode.viewfinder" : "camera")
                .font(.system(size: 72, weight: .thin))
                .foregroundStyle(.white.opacity(0.7))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .overlay(alignment: .bottomLeading) {
            Button(action: dismissCamera) {
                Image(systemName: "chevron.left")
                    .font(.body.bold())
                    .foregroundStyle(.white)
                    .frame(width: 54, height: 54)
            }
            .buttonStyle(.plain)
            .glassEffect(.regular.interactive(), in: .circle)
            .accessibilityLabel("Close camera")
            .padding()
        }
    }

    private func dismissCamera() {
        withAnimation(.smooth(duration: 0.46, extraBounce: 0)) {
            destination = nil
        }
    }

    private enum Destination: Equatable {
        case barcode
        case meal

    }
}

#Preview("Plus to camera flow") {
    FoodSearchComposerFlowPreview()
}
#endif
