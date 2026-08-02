# Contributing

## Setup

Install Node.js 22.22.0 or newer and pnpm 11, then run:

```bash
pnpm install --frozen-lockfile
```

Before submitting a change, run `pnpm run validate`, `pnpm run typecheck`,
`pnpm run lint`, `pnpm run format:check`, `pnpm run test`, `pnpm run build`, and
`pnpm run package:check`.

Only Sleeper's publicly documented API is in scope. Do not use private endpoints,
credentials, SDKs, or API wrappers. Runtime dependencies require a concrete technical
justification and review; the default is zero runtime dependencies.

Preserve existing internal resource, operation, and parameter values unless a documented bug
requires a breaking change. Examples must remain inactive, credential-free, and free of real
user or league identifiers. See [SECURITY.md](SECURITY.md) for vulnerability reporting and
[docs/releasing.md](docs/releasing.md) for the owner-approved release process.
