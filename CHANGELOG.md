# Changelog

## Unreleased

- Audit all direct-node labels and descriptions while preserving workflow-facing resource,
  operation, and parameter values.
- Replace scaffold artwork with safe light/dark football icons incorporating the MIT-licensed
  Tabler Icons `ball-american-football` asset and add icon safety and metadata contracts.
- Add importable example workflows, prerelease documentation, a security policy, and release
  readiness guidance.
- Add a manual-only, tag-gated GitHub Actions workflow for dry-run, transitional first publish,
  and tokenless trusted-publishing modes.
- Add a shared, GET-only Sleeper API transport with fixed-origin URL construction, safe path
  encoding, finite timeouts, and n8n-native error normalization.
- Add reusable validation and output conversion for opaque string IDs, four-digit seasons,
  NFL sport values, raw JSON output, and paired-item metadata.
- Add User → Get, League → Get, League → Get Many for User, and Sport → Get State.
- Add mocked transport and programmatic execution tests for successful, empty, invalid, and
  failed responses across multiple input items.
- Add League User → Get Many, Roster → Get Many, Matchup → Get Many, Transaction → Get Many,
  Playoff → Get Bracket, and Traded Pick → Get Many using documented read-only endpoints.
- Add positive-integer week and round validation, controlled playoff bracket paths, and mocked
  contract coverage for raw array responses and multi-input execution.
- Add Draft → Get, Draft → Get Many for League, Draft → Get Many for User, Draft Pick → Get
  Many, and Draft Traded Pick → Get Many using documented read-only endpoints.
- Preserve raw draft, pick, and draft-scoped traded-pick records with strict response-shape
  handling, exact string IDs, per-input parameter resolution, and paired output metadata.
- Add Player → Get Many with documented active and position filters, raw single-map and
  ordered split-item output modes, and no hidden caching or truncation.
- Add Player → Get Trending with controlled add/drop requests, positive safe-integer query
  parameters, raw attributed results, and no automatic player enrichment.
- Add Avatar → Get URL for local full-size and thumbnail Sleeper CDN URL construction without
  network requests or binary output.

## 0.1.0 - Pending

- Intended first public prerelease. Not yet published.
