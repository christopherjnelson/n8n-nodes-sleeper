# Community testing

## Release under test

- Package: `n8n-nodes-sleeper`
- Stable version: `0.2.1`
- Default selector: `n8n-nodes-sleeper`
- Secondary selector: `n8n-nodes-sleeper@next`
- Exact selector: `n8n-nodes-sleeper@0.2.1`
- Status: stable/default release on npm; ongoing self-hosted compatibility testing is welcome
- Coverage: 18 direct operations across 14 resources and four Phase 1 trigger events
- Scope: read-only public Sleeper data, no credentials, and an NFL-first visible interface
- Distribution: npm `latest → 0.2.1` and `next → 0.2.0`; the default installer receives `0.2.1`.
  Creator Portal and n8n Cloud updates for `0.2.1` remain separate owner-managed steps and are not
  claimed complete.

## 0.2.1 stable release

The stable release migrates all 18 action operations to declarative routing, retains the stateful
polling trigger as a documented programmatic exception, and packages the current Sleeper robot
favicon. Owner manual editor smoke testing completed on 2026-09-08.

## 0.2.0 stable release

Version `0.2.0` introduced the complete Phase 1 implementation for Draft Pick Made, Transaction
Created or Updated, League Status Changed, and NFL Week Changed. Owner real-instance evaluation
is complete. That immutable package remains available through `n8n-nodes-sleeper@next` or its
exact `0.2.0` selector; it was promoted without rebuilding or republishing the package.

## Installation methods

### n8n Community Nodes interface

In a self-hosted n8n instance, open **Settings → Community Nodes**, choose the option to
install a community node, and enter:

```text
n8n-nodes-sleeper
```

The normal installer resolves stable version `0.2.1` because npm's `latest` tag points to `0.2.1`.

### n8n Cloud

Search for **Sleeper** in the node picker or canvas. Creator Portal submission and n8n Cloud
availability for `0.2.1` have not been verified and remain separate owner-managed steps. Confirm
the installed version before relying on current action or trigger behavior.

### npm testing

The retained secondary tag remains on the earlier testing artifact:

```bash
npm install n8n-nodes-sleeper@next
```

This selector resolves to `0.2.0`; npm `latest` resolves to stable `0.2.1`.

### Exact-version testing

For reproducible testing, pin the exact public version:

```bash
npm install n8n-nodes-sleeper@0.2.1
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
- Stable/default `0.2.1` includes all four trigger events.
- Sleeper documents no single-player endpoint; the node does not invent one.
- **Player → Get Many** can return a large map. Use server-side filters, avoid unnecessary
  polling, and generally fetch the full player map no more than once daily.
- Two reviewed moderate development-only alerts remain through upstream n8n tooling (`uuid` and
  `stream-json`). Neither is a runtime dependency or enters the published tarball.
- npm `latest` and the default installer resolve to `0.2.1`; npm `next` remains on `0.2.0`.

## Success criteria

Ongoing compatibility confidence benefits from feedback demonstrating:

- multiple clean installations
- successful loading in more than one supported n8n environment
- no confirmed data corruption, packaging failure, or node-loading failure
- no security regression
- no unresolved high-severity release blocker

These are ongoing testing goals, not claims about tester counts already achieved or gates on the
completed stable promotion.
