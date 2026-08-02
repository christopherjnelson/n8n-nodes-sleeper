# Changelog

## Unreleased

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

## 0.1.0 - 2026-08-01

- Scaffold the unpublished Sleeper community-node project.
