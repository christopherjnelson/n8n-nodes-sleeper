# Release readiness

## Current status — 2026-10-07

- Version `0.3.0` is merged to `main` as an unpublished source candidate. The package is not yet
  available from npm; owner approval, the manual release workflow, and separate approval of the npm
  stage remain required before publication.
- Historical pre-feature source checkpoint `e0db716` passed main CI run `37662041024` and release
  dry-run run `37662058905`. Before publishing, verify CI and a release dry-run on the exact release
  commit; check the [CI workflow](https://github.com/christopherjnelson/n8n-nodes-sleeper/actions/workflows/ci.yml)
  and [Release workflow](https://github.com/christopherjnelson/n8n-nodes-sleeper/actions/workflows/release.yml)
  for their current results. This checkpoint records source and runtime validation.
- The 2026-10-06 packed-package editor check used n8n 2.41.6 / Node 24.18.0 and validated the
  supported action/API paths and trigger baseline behavior. On 2026-10-07, the editor picker check
  confirmed the updated shared summary, 18 actions, and four trigger events. Neither check waited
  for a future Sleeper event transition.
- Current verified published selectors remain `latest → 0.2.1` and `next → 0.2.0`. Check npm
  before relying on these tags; do not install `0.3.0` until it is published.
- No new n8n Cloud availability or Creator Portal update is claimed for `0.3.0`.

## 0.3.0 candidate — unpublished

- Merged version `0.3.0` adds bounded NBA/NHL action support and lossless unsafe opaque-ID output for Draft Traded Pick.
- The Player → Get Many local output controls and NFL/NBA static Position dropdowns are new source changes in this candidate. The final reported automated checkpoint passed 93 Vitest and 114 CommonJS tests (207 total). The first packed output-control smoke exposed an item-linking issue. The corrected package passed the six-case n8n 2.42.4 / Node 24.18.0 runtime check on 2026-10-07, including NBA/NHL map and split outputs, invalid limits, sorting, and `.item` pairing. The earlier `0.3.0` editor evidence below predates these controls.
- Publication and staging remain pending owner approval; no npm stage, publication, or dist-tag change has occurred for `0.3.0`.
- The prepared source passes local format, lint, both TypeScript checks, unit and retained trigger tests (93 Vitest and 114 CommonJS tests), source review/scan, build, release configuration audit, package boundary, isolated load, and isolated install checks. The final test-only changes did not change the packed package. The official published-package scanner is intentionally deferred until the owner-approved package is public. Do not describe `0.3.0` as available before the immutable publication step.
- The candidate adds no NBA/NHL week trigger; the existing NFL Week Changed event remains NFL-only.
- Template guidance was reviewed on 2026-10-06 against upstream source snapshot `596e784cfe69cd8894529b8a81c491921cde9773` (template baseline 2.2 plus its unversioned current follow-up guidance). The review retained the repository's pnpm package manager and manual trusted-stage release flow where the template's generic defaults did not fit.
- The smoke-tested 37-file package (`SHA-256 a5422199fb90b1fecc53d7704c2f9719791e7af909112d9aea8a1a2e529659c6`) was loaded in isolated n8n 2.41.6 / Node 24.18.0 on 2026-10-06. The editor smoke verified NFL/NBA/NHL state, NBA player/trending and seasonal list routes, NHL player catalog, NBA league/draft operations, exact unsafe traded-pick ID preservation, and the stale NHL Position guard: the invalid saved filter failed locally without reaching its downstream sentinel, while the unfiltered NHL catalog completed. For Draft Pick Made, activation established a baseline at observed pick number 378, an unchanged scheduled poll emitted no event, and reactivation after restart restored the same saved state; manual preview also returned the expected event shape. No future external event transition was asserted. The repeatable editor procedure is in [manual testing](manual-testing.md).
- GitHub's latest 2026-10-06 lockfile snapshot lists 27 open Dependabot alerts: 7 high, 17 moderate, and 3 low, all classified as development dependencies. The current alert list is available in the [repository Dependabot dashboard](https://github.com/christopherjnelson/n8n-nodes-sleeper/security/dependabot). The package has no runtime dependencies; `n8n-workflow` remains a host peer dependency. The sports change adds no unrelated dependency upgrades.

## Historical records

Dated release, security, and validation checkpoints are preserved in
[the release history](archive/release-history.md).
