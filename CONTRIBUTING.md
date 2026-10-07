# Contributing

## Setup

Install Node.js 22.22.0 or newer and pnpm 11, then run:

```bash
pnpm install --frozen-lockfile
```

Before submitting a change, follow the complete gate list in
[docs/testing.md](docs/testing.md), including source review/scan, package load/install smoke, and
release configuration checks where applicable.

Only Sleeper's public API endpoints are in scope. Prefer documented behavior. If a live public
response differs from the official documentation, record that evidence and caveat the behavior as
observed rather than guaranteed. Do not use private endpoints, credentials, SDKs, or API wrappers.
Runtime dependencies require a concrete technical justification and review; the default is zero
runtime dependencies.

Preserve existing internal resource, operation, and parameter values unless a documented bug
requires a breaking change. Examples must remain inactive, credential-free, and free of real
user or league identifiers. See [SECURITY.md](SECURITY.md) for vulnerability reporting and
[docs/releasing.md](docs/releasing.md) for the owner-approved release process.
