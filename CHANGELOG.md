# Changelog

## Unreleased

- No changes yet.

## [0.2.0] - 2026-08-08

- Add the credential-free Sleeper Trigger node with four polling events: Draft Pick Made,
  Transaction Created or Updated, League Status Changed, and NFL Week Changed.
- Establish first-run baselines for every event so existing Sleeper history is not replayed when a
  production trigger is activated.
- Use monotonic anti-replay state for draft picks, transactions, league lifecycle progression, and
  the season-aware NFL week cursor.
- Detect new transaction IDs and increased `status_updated` values while retaining bounded state
  across truncated responses.
- Track forward-only league lifecycle progression and suppress equal, backward, or stale states.
- Track NFL week changes with a season-aware `season` → `season_type` → `week` cursor that safely
  handles season-type and season rollover.
- Continue using only Sleeper's public API with no credentials and zero runtime dependencies.
- Preserve all 18 existing action-node operations and their workflow-facing behavior.

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
