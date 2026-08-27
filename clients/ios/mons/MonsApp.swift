//
//  MonsApp.swift
//  mons
//
//  Created by Jeremy Scott on 8/3/26.
//

import ClerkKit
import ClerkKitUI
import SwiftUI

@main
struct MonsApp: App {
    @State private var store = AppStore()
    private let clerk: Clerk?

    #if DEBUG
    @State private var tabBarPOCStore = AppStore.preview

    private var isTabBarPOCEnabled: Bool {
        ProcessInfo.processInfo.arguments.contains("-tabBarPOC")
            || ProcessInfo.processInfo.arguments.contains("-searchPOC")
            || ProcessInfo.processInfo.arguments.contains("-cameraPOC")
            || ProcessInfo.processInfo.arguments.contains("-cameraAutoDismissPOC")
            || ProcessInfo.processInfo.arguments.contains("-recipesPOC")
    }

    private var previewTab: AppTab {
        if ProcessInfo.processInfo.arguments.contains("-searchPOC")
            || ProcessInfo.processInfo.arguments.contains("-cameraPOC")
            || ProcessInfo.processInfo.arguments.contains("-cameraAutoDismissPOC") {
            .calories
        } else if ProcessInfo.processInfo.arguments.contains("-recipesPOC") {
            .recipes
        } else {
            .dashboard
        }
    }
    #endif

    init() {
        let environment = ProcessInfo.processInfo.environment
        if
            environment["XCODE_RUNNING_FOR_PREVIEWS"] != "1",
            environment["XCTestConfigurationFilePath"] == nil
        {
            clerk = Clerk.configure(
                publishableKey: "pk_test_YmlnLWNvdy04Mi5jbGVyay5hY2NvdW50cy5kZXYk"
            )
        } else {
            clerk = nil
        }
    }

    var body: some Scene {
        WindowGroup {
            if let clerk {
                Group {
                    #if DEBUG
                    if isTabBarPOCEnabled {
                        ContentView(initialSelection: previewTab)
                            .environment(tabBarPOCStore)
                    } else {
                        AuthenticationGateView()
                    }
                    #else
                    AuthenticationGateView()
                    #endif
                }
                    .tint(.blue)
                    .prefetchClerkImages()
                    .environment(clerk)
                    .environment(store)
            } else {
                EmptyView()
            }
        }
    }
}
