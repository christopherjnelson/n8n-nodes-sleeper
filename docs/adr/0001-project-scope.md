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

## Later scope evidence

The 0.3.0 work added operation-specific NBA and NHL support without changing the read-only,
credential-free public-endpoint boundary. Some publicly observed NBA seasonal user-listing
behavior differs from Sleeper's NFL-only documentation; that support remains explicitly caveated
in the API matrix rather than being treated as a documented guarantee. The original NFL-first
decision remains the historical starting scope, not a statement that current source is NFL-only.
