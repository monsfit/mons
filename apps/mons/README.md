# Mons

Mons is the SwiftUI client application.

It connects to the Regolith API for:

- adult onboarding that estimates TDEE and a weight-goal calorie target;
- a dashboard for today's nutrition, weekly workouts, and weight trend;
- a compact Liquid Glass control rail with primary tabs, global food search, and quick actions;
- separate Common, Branded, and Recently Added food sections with compact nutrition summaries;
- camera barcode scanning with normalized UPC/EAN/GTIN lookup;
- quantity-scaled full nutrient details, daily-target progress, logging, and day summaries;
- persistent strength/cardio workouts and ordered sets;
- canonical weight tracking with pound and kilogram entry.

Open `mons.xcodeproj` in Xcode, or build and test it from the repository root:

```bash
npx pnpm@11.20.0 mons:check
```

`mons:check` treats Swift warnings as errors, enables complete strict-concurrency checking,
builds the iOS Simulator target, and runs the deterministic test suite. Project-local iOS review
skills are checked into `.agents/skills`; their pinned provenance and update policy are documented
in `.agents/skills/README.md`.

The project, application target, test target, scheme, Swift module, and bundle identifiers
all use the `mons` name. Local Xcode user state and Derived Data are intentionally ignored.

The default API URL is `http://127.0.0.1:3000`, which works from the iOS Simulator and the
macOS build. Start PostgreSQL and the API before launching Mons:

```bash
npx pnpm@11.20.0 db:up
npx pnpm@11.20.0 db:migrate
npx pnpm@11.20.0 dev
```

For a physical iPhone, add the `REGOLITH_API_BASE_URL` environment variable to the Xcode
scheme's Run action and set it to the Mac's LAN address, such as
`http://192.168.1.10:3000`. Barcode scanning requires a physical device.

On first launch, Mons presents a compact step-by-step onboarding flow for metabolic inputs,
measurements, exercise frequency, normal daily activity, weight goal, and goal velocity. The
app previews the estimate locally, then saves the inputs to the API and uses the authoritative
returned calorie target throughout the calorie log. Dates and calculators accept injected clocks
and calendars so fixtures remain deterministic.

## Design system

Mons uses a monochrome Lunar Plum system with semantic roles instead of screen-level color
choices. The source tokens live in `mons/DesignSystem/Foundation`:

- plum 25–150 provides light-mode backgrounds, surfaces, and borders;
- plum 900–1000 provides dark-mode backgrounds and light-mode text;
- near-white plum carries dark-mode text and high-contrast actions;
- one adaptive plum metric token covers calories, macros, weight, workouts, progress, and selection;
- Error Red is reserved for destructive actions, validation failures, and critical alerts.

All semantic colors adapt automatically to the system light or dark appearance. Mons does not
force a color scheme. Primary, secondary, muted, action, and error foregrounds maintain at least
4.8:1 contrast against the app background in both appearances.

Spacing, corner radii, button styles, cards, and the wordmark are shared components under
`mons/DesignSystem`. Add new visual decisions there before adding one-off values to a feature.
Liquid Glass is limited to navigation and floating actions. The bottom control rail keeps tabs,
global food search, and quick food actions on one baseline without covering content, while sheet
content uses system material backgrounds so controls remain legible in both appearances.

Food detail uses the profile's calculated calorie and macro goals. Other compatible nutrients use
the FDA Daily Values for adults and children age four or older as deterministic nutrition-label
references. Nutrients without an applicable Daily Value are shown as `No DV`; Mons does not invent
targets or present these reference values as individualized clinical recommendations.

[Space Grotesk](https://floriankarsten.github.io/space-grotesk/) is bundled locally in Regular,
Medium, and Bold weights under the SIL Open Font License. `MonsTypography` provides Dynamic
Type-aware roles; feature views should use those roles rather than fixed font sizes. The bundled
license is preserved at `mons/DesignSystem/Fonts/SPACE_GROTESK_LICENSE.txt`.
