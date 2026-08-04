import SwiftUI

struct FoodCatalogSearchBar: View {
    @Binding var searchText: String
    let isLogging: Bool
    let pendingItemCount: Int
    let onLog: () -> Void
    let onScan: () -> Void

    var body: some View {
        GlassEffectContainer(spacing: MonsSpacing.small) {
            HStack(spacing: MonsSpacing.small) {
                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(MonsColor.textSecondary)
                        .accessibilityHidden(true)

                    TextField("Search for a food", text: $searchText)
                        .font(MonsTypography.body)
                        .textFieldStyle(.plain)

                    Button("Scan barcode", systemImage: "barcode.viewfinder", action: onScan)
                        .labelStyle(.iconOnly)
                        .frame(width: 44, height: 44)
                        .contentShape(.rect)
                        .buttonStyle(.plain)
                }
                .padding(.leading, 16)
                .padding(.trailing, 4)
                .frame(minHeight: 52)
                .glassEffect(.regular.interactive(), in: .capsule)

                if pendingItemCount > 0 {
                    Button(action: onLog) {
                        if isLogging {
                            ProgressView()
                                .frame(minWidth: 78)
                        } else {
                            Text("Log Foods")
                                .frame(minWidth: 78)
                        }
                    }
                    .buttonStyle(.glassProminent)
                    .buttonBorderShape(.capsule)
                    .tint(MonsColor.action)
                    .disabled(isLogging)
                    .accessibilityLabel("Log \(pendingItemCount) foods")
                }
            }
        }
        .tint(MonsColor.textPrimary)
        .padding(.horizontal)
        .padding(.vertical, 8)
    }
}
