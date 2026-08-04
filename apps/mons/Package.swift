// swift-tools-version: 6.2

import PackageDescription

let package = Package(
    name: "MonsModules",
    platforms: [
        .iOS(.v26),
        .macOS(.v26),
        .visionOS(.v26),
    ],
    products: [
        .library(name: "MonsDesignSystem", targets: ["MonsDesignSystem"]),
        .library(name: "MonsDashboardFeature", targets: ["MonsDashboardFeature"]),
    ],
    targets: [
        .target(
            name: "MonsDesignSystem",
            path: "mons/DesignSystem",
            resources: [.process("Fonts")]
        ),
        .target(
            name: "MonsDashboardFeature",
            dependencies: ["MonsDesignSystem"],
            path: "Packages/MonsDashboardFeature"
        ),
        .testTarget(
            name: "MonsDashboardFeatureTests",
            dependencies: ["MonsDashboardFeature"],
            path: "Packages/MonsDashboardFeatureTests"
        ),
    ]
)
