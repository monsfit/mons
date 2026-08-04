//
//  MonsApp.swift
//  mons
//
//  Created by Jeremy Scott on 8/3/26.
//

import SwiftUI

@main
struct MonsApp: App {
    @State private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(store)
                .task {
                    await store.bootstrap()
                }
        }
    }
}
