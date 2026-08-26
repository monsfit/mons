import PhotosUI
import SwiftUI

struct FoodSearchInputModifier<CameraContent: View>: ViewModifier {
    @Binding var searchText: String
    @Binding var selectedPhoto: PhotosPickerItem?
    @Binding var isMenuExpanded: Bool

    let cameraTransitionNamespace: Namespace.ID
    let isCameraPresented: Bool
    let usesComposer: Bool
    let onBarcode: () -> Void
    let onCamera: () -> Void
    let onPaste: () -> Void
    let onVoiceCapture: (Data) async -> Void
    @ViewBuilder let cameraContent: () -> CameraContent

    @ViewBuilder
    func body(content: Content) -> some View {
        #if os(iOS)
        if usesComposer {
            content
                .safeAreaInset(edge: .bottom, spacing: 0) {
                    Color.clear.frame(height: 76)
                }
                .overlay(alignment: .bottom) {
                    FoodSearchComposer(
                        searchText: $searchText,
                        selectedPhoto: $selectedPhoto,
                        isMenuExpanded: $isMenuExpanded,
                        cameraTransitionNamespace: cameraTransitionNamespace,
                        isCameraPresented: isCameraPresented,
                        onBarcode: onBarcode,
                        onCamera: onCamera,
                        onPaste: onPaste,
                        onVoiceCapture: onVoiceCapture,
                        cameraContent: cameraContent
                    )
                }
        } else {
            content.searchable(text: $searchText, placement: .toolbar, prompt: "Search for a food")
        }
        #else
        content.searchable(text: $searchText, prompt: "Search for a food")
        #endif
    }
}
