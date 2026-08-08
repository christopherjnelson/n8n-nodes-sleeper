# Changelog

## Unreleased

- Add the Sleeper Trigger framework and Draft Pick Made polling.
- Add Transaction Created or Updated polling for new transaction IDs and increased
  `status_updated` values, with a first-run baseline and monotonic anti-replay state.
- Add League Status Changed polling with an explicit League ID, exactly one league request per
  poll, a first-run baseline, forward-only monotonic lifecycle state, and backward or stale
  response suppression.
- Establish the current draft-pick baseline on first activation so historical picks do not fire.
- Preserve all existing action-node behavior.
- No published package version has changed; all trigger work remains unreleased 0.2.0 development.

## [0.1.1] - 2026-08-03

- Change the n8n codex node identifier from `n8n-nodes-sleeper` to
  `n8n-nodes-sleeper.sleeper` for Creator Portal compatibility.
- Remove the unsupported `Developer Tools` category, leaving exactly `Development`.
- Preserve all runtime behavior and workflow-facing resources, operations, parameters,
  credentials, outputs, and icons.

## [0.1.0] - 2026-08-02

- Add all 18 credential-free, read-only operations across user, league, roster, matchup,
  transaction, playoff, traded-pick, draft, player, sport, and avatar resources.
- Add player-map single-map and split-item modes with server-side active and position filters,
  plus raw trending-player results with explicit Sleeper attribution guidance.
- Generate full-size and thumbnail avatar URLs locally without an HTTP request.
- Preserve raw API data, exact string IDs, per-input pairing, controlled validation, and
  n8n-native error behavior without runtime dependencies.
- Add light and dark football icons, examples, 94 automated tests, official n8n validation,
  packaging checks, and manual tag-gated release hardening.
- Publish the prerelease from GitHub Actions with npm provenance under the `next` dist-tag.
- Document the project as an unofficial community integration with no affiliation to Sleeper
  or Blitz Studios.
