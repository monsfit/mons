import SwiftUI

struct PlaceholderDetailView: View {
    let destination: DetailDestination

    init(_ destination: DetailDestination) {
        self.destination = destination
    }

    var body: some View {
        ContentUnavailableView(
            destination.title,
            systemImage: destination.systemImage,
            description: Text(destination.subtitle)
        )
        .navigationTitle(destination.title)
    }
}
