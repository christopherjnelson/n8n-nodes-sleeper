# ADR 0001: Project scope and delivery constraints

- Status: Accepted
- Date: 2026-08-01

## Decision

The node will use only Sleeper's public documented API. It will be read-only, require no
credentials, and support NFL use cases first. HTTP requests will use n8n's native transport,
with zero runtime dependencies.

An action node will precede any polling trigger. Large player datasets will not be hidden in
workflow static data. The official release path will publish through GitHub Actions with npm
provenance; developer laptops will not publish the package.
