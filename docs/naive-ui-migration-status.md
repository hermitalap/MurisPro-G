# Naive UI Migration Status

Last updated: 2026-03-16

## Scope
Migrate frontend UI to Naive UI, migrate icon system to vicons, and phase out legacy custom frontend component patterns.

## Completed
- Added dependencies: `naive-ui`, `@vicons/ionicons5`.
- Removed legacy icon dependency: `@material-design-icons/font`.
- Wired Naive UI in app entry (`src/main.js`).
- Added global icon adapter component: `src/components/AppIcon.vue`.
- Replaced major Material icon usage with `AppIcon` in key views.
- Fixed dynamic sort icon rendering in:
  - `src/views/MiceView.vue`
  - `src/views/WeightView.vue`
- Removed remaining `material-icons` style selectors in active source files:
  - `src/App.vue`
  - `src/views/styles/main.css`
  - `src/views/Setting.vue`
- Added Naive global provider shell in `src/App.vue`:
  - `n-config-provider`
  - `n-message-provider`
  - `n-dialog-provider`
  - `n-notification-provider`
- Added global Naive theme overrides in `src/App.vue` (`themeOverrides`).
- Migrated App shell toggle controls to Naive buttons (`n-button`) in `src/App.vue`.
- Migrated App sidebar tooltip layer from custom CSS tooltips to Naive `n-tooltip`.
- Migrated App sidebar navigation from custom `router-link` blocks to Naive `n-menu` (data-driven options + route key mapping).
- Migrated a first batch of interaction controls in:
  - `src/views/ExperimentDisplay.vue` (tab/action/modal/reset/save buttons -> `n-button`)
  - `src/components/IdGroupingManager.vue` (selection/grouping/action buttons -> `n-button`)
- Migrated control inputs in:
  - `src/views/ExperimentDisplay.vue`
    - search input -> `n-input`
    - group filter -> `n-select`
    - record date -> `n-date-picker`
    - researcher input -> `n-input`
  - `src/components/IdGroupingManager.vue`
    - repeat-selection switch area -> `n-checkbox`
    - search input -> `n-input`
    - group name input -> `n-input`
- Migrated experiment page modal layer in `src/views/ExperimentDisplay.vue`:
  - record modal container -> `n-modal` (card preset)
  - ID grouping modal container -> `n-modal`
- Migrated tab and residual selection controls:
  - `src/views/ExperimentDisplay.vue`
    - custom tab button bar -> `n-tabs` / `n-tab-pane`
  - `src/components/IdGroupingManager.vue`
    - candidate row checkbox -> `n-checkbox`
- Build validation passed (`npm run build`).

## Current Validation Result
- Source scan (excluding `.history`) found no remaining:
  - `material-icons`
  - `@material-design-icons/font`
- Build status: success.
- Non-blocking warnings:
  - Browserslist data is outdated.
  - Bundle size warnings.

## Delivery Snapshot
- Delivery gate passed for this migration phase:
  - App shell and sidebar navigation are migrated to Naive primitives.
  - Experiment page and ID grouping page are migrated for primary interactive controls.
  - Icon stack migration is complete and validated.
- This state is suitable for functional acceptance and staging deployment.

## Not Completed Yet
- Full-repo deep migration is still pending in large legacy pages, especially:
  - `src/views/Setting.vue`
- Table-editing surfaces are intentionally still Tabulator-native and not replaced by Naive table components.
- Some page-level legacy layout CSS remains and can be refactored in a later polish phase.

## Recommended Next Start Steps
1. Migrate `Setting.vue` high-frequency controls first:
   - buttons -> `n-button`
   - inputs/selects -> `n-input`, `n-select`
   - dialogs -> `n-modal`
2. Run regression checks after each page migration:
   - add/edit/delete flows
   - sort/filter behaviors
   - import/export dialogs
3. Re-run build and scan after each migration batch.

## Useful Commands
- Legacy icon scan (real source only):
  - `Get-ChildItem -Path src -Recurse -File | Where-Object { $_.FullName -notlike '*\.history\*' } | Select-String -Pattern 'material-icons|@material-design-icons/font'`
- Build validation:
  - `npm run build`

## Notes
- `.history` folder contains snapshot noise; do not use it to judge migration completeness.
- Prior dependency install issues were caused by registry/lockfile mirror URLs and have already been fixed.
