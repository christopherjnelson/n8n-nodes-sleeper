# Contributing

## Setup

Install Node.js 22.22.0 or newer and pnpm 11, then run:

```bash
pnpm install --frozen-lockfile
```

Before submitting a change, run `pnpm run validate`, `pnpm run typecheck`,
`pnpm run lint`, `pnpm run format:check`, `pnpm run test`, `pnpm run build`, and
`npm pack --dry-run`.

Only Sleeper's publicly documented API is in scope. Do not use private endpoints,
credentials, SDKs, or API wrappers. Runtime dependencies require a concrete technical
justification and review; the default is zero runtime dependencies.
