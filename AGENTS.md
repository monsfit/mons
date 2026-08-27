# Mons agent guidance

## Mons iOS application

When changing `clients/ios`, use the project-local skills under `.agents/skills`:

- `swiftui-ui-patterns` and `swiftui-view-refactor` for SwiftUI feature work;
- `swift-concurrency-expert` for async code, actors, and shared state;
- `swiftui-liquid-glass` for glass surfaces and interaction styling;
- `swiftui-performance-audit` for scroll, rendering, or observation performance;
- `ios-debugger-agent` for simulator builds and runtime diagnosis when its tools are available.

Keep one major Swift type per file, use deterministic fixtures, and preserve the feature-based folder structure. Validate iOS work from the repository root with:

```bash
npx pnpm@11.20.0 mons:check
```
