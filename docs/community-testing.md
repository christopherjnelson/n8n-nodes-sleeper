# Community testing

## Release under test

- Package: `n8n-nodes-sleeper`
- Stable version: `0.2.0`
- Default selector: `n8n-nodes-sleeper`
- Secondary selector: `n8n-nodes-sleeper@next`
- Exact selector: `n8n-nodes-sleeper@0.2.0`
- Status: stable/default release on npm; ongoing self-hosted compatibility testing is welcome
- Coverage: 18 direct operations across 14 resources and four Phase 1 trigger events
- Scope: read-only public Sleeper data, no credentials, and an NFL-first visible interface
- Distribution: npm `latest → 0.2.0` and `next → 0.2.0`; the default installer receives `0.2.0`.
  The currently approved n8n Cloud version has not yet been updated to `0.2.0`.

## 0.2.0 stable release

Phase 1 implementation is complete for Draft Pick Made, Transaction Created or Updated, League
Status Changed, and NFL Week Changed. Owner real-instance evaluation is complete. The same
immutable `0.2.0` package is available through the default selector, `n8n-nodes-sleeper@next`, or
`n8n-nodes-sleeper@0.2.0`; it was promoted without rebuilding or republishing the package.

## Installation methods

### n8n Community Nodes interface

In a self-hosted n8n instance, open **Settings → Community Nodes**, choose the option to
install a community node, and enter:

```text
n8n-nodes-sleeper
```

The normal installer resolves stable version `0.2.0` because npm's `latest` tag points to `0.2.0`.

### n8n Cloud

Search for **Sleeper** in the node picker or canvas. The verified published action node is
available directly in n8n Cloud. The currently approved Cloud version has not yet been updated to
`0.2.0`, so the Sleeper Trigger is not yet available there.

### npm testing

The retained secondary tag resolves to the same stable artifact:

```bash
npm install n8n-nodes-sleeper@next
```

This selector and npm `latest` both resolve to `0.2.0`.

### Exact-version testing

For reproducible testing, pin the exact public version:

```bash
npm install n8n-nodes-sleeper@0.2.0
```

## Requested test coverage

Please include the following in compatibility or bug reports:

- n8n version and deployment type
- Node.js version and operating system or container image
- package installation method and resolved package version
- resource and operation tested
- whether Sleeper appeared exactly once in node search
- whether both light and dark icons behaved correctly
- sanitized input configuration and reproduction steps
- observed output shape and expected output shape
- error behavior and, when tested, `continueOnFail()` behavior
- AI-tool behavior, when tested
- all four trigger events: Draft Pick Made, Transaction Created or Updated, League Status Changed,
  and NFL Week Changed
- workflow activation and deactivation
- repeated polling and no-change suppression
- switching event or event-specific configuration and establishing the new baseline
- persistence across an n8n restart without replay
- real transaction, draft, NFL week, and league-status transitions where practical
- regression coverage for existing action operations, especially Sport → Get State

Naturally occurring events are useful evidence where practical, but waiting for one is not a
condition for installing or beginning compatibility testing. Share only sanitized test evidence.

Use the repository's
[issue forms](https://github.com/christopherjnelson/n8n-nodes-sleeper/issues/new/choose) so reports
contain enough environment and reproduction detail to triage. General coordination and links to
new reports may reference the historical
[v0.1.0 community-testing issue](https://github.com/christopherjnelson/n8n-nodes-sleeper/issues/1).
That issue still contains stale v0.1.0, npm-tag, verification, and trigger statements; follow this
guide for current status until the issue is updated separately.

## Privacy and test-data rules

Sleeper endpoints expose public data, but public issue reports should still minimize identifying
information. Do not post private league IDs unnecessarily, and redact usernames, league names,
or other identifying data. Never paste account cookies, tokens, credentials, or complete
production execution data.

Report security issues through
[private vulnerability reporting](https://github.com/christopherjnelson/n8n-nodes-sleeper/security/advisories/new),
not a public issue.

## Known limitations

- The package is read-only and exposes only NFL in its visible sport choices.
- Stable/default `0.2.0` includes all four trigger events.
- Sleeper documents no single-player endpoint; the node does not invent one.
- **Player → Get Many** can return a large map. Use server-side filters, avoid unnecessary
  polling, and generally fetch the full player map no more than once daily.
- One reviewed moderate `uuid` alert remains through upstream n8n development tooling. It is not
  a runtime dependency and is absent from the published tarball.
- npm `latest`, npm `next`, and the default installer all resolve to `0.2.0`.

## Success criteria

Ongoing compatibility confidence benefits from feedback demonstrating:

- multiple clean installations
- successful loading in more than one supported n8n environment
- no confirmed data corruption, packaging failure, or node-loading failure
- no security regression
- no unresolved high-severity release blocker

These are ongoing testing goals, not claims about tester counts already achieved or gates on the
completed stable promotion.
