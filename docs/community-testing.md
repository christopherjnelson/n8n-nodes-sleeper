# Community testing

## Release under test

- Package: `n8n-nodes-sleeper`
- Version: `0.1.1`
- Status: verified by n8n, published on npm, and available directly in n8n Cloud
- Coverage: 18 direct operations across 14 resources
- Scope: read-only public Sleeper data, no credentials, and an NFL-first visible interface
- Published-package exclusions: trigger nodes, writes, joins, enrichment, and composite convenience
  operations. Source `0.2.0` is a prepared candidate with four trigger events, but it has not been
  published to npm or submitted as an n8n update. The trigger is not in npm `0.1.1` or n8n Cloud.

## 0.2.0 candidate

Phase 1 implementation is complete for Draft Pick Made, Transaction Created or Updated, League
Status Changed, and NFL Week Changed. The source version is `0.2.0`, but it is not yet installable
from npm. After owner-approved staged publication, the immutable candidate will be tested through
`n8n-nodes-sleeper@next`. Until that publication occurs, `next`, `latest`, the normal Community
Nodes installer, and the exact public-version instructions below all continue to resolve to or use
`0.1.1`.

## Installation methods

### n8n Community Nodes interface

In a self-hosted n8n instance, open **Settings → Community Nodes**, choose the option to
install a community node, and enter:

```text
n8n-nodes-sleeper
```

The normal installer resolves the current published version, `0.1.1`, because npm's `latest` tag
points to `0.1.1`.

### n8n Cloud

Search for **Sleeper** in the node picker or canvas. The verified published action node is
available directly in n8n Cloud. The unreleased Sleeper Trigger is not yet available there.

### npm testing

Use the prerelease testing tag:

```bash
npm install n8n-nodes-sleeper@next
```

This selector currently resolves to `0.1.1`, as does `latest`. Version `0.1.1` remains the current
published community-testing release.

### Exact-version testing

For reproducible testing, pin the public version:

```bash
npm install n8n-nodes-sleeper@0.1.1
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
- Published `0.1.1` has no write operations, triggers, joins, enrichment, or composite convenience
  operations. All four trigger events exist only in the prepared, unpublished source `0.2.0`
  candidate.
- Sleeper documents no single-player endpoint; the node does not invent one.
- **Player → Get Many** can return a large map. Use server-side filters, avoid unnecessary
  polling, and generally fetch the full player map no more than once daily.
- One reviewed moderate `uuid` alert remains through upstream n8n development tooling. It is not
  a runtime dependency and is absent from the published tarball.
- npm `next` and `latest` both resolve to `0.1.1`.

## Success criteria

The prerelease can advance after feedback demonstrates:

- multiple clean installations
- successful loading in more than one supported n8n environment
- no confirmed data corruption, packaging failure, or node-loading failure
- no security regression
- no unresolved high-severity release blocker

These are goals for community testing, not claims about tester counts already achieved.
