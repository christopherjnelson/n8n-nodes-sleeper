# Community testing

## Source candidate status — checked 2026-10-07

The `0.3.0` source is merged and its packed candidate has completed supervised editor and public-API checks. Owner testing is ongoing. It remains unpublished: a new npm install still resolves the published `0.2.1` stable package unless the registry changes after this guide was updated. The candidate adds operation-specific NBA/NHL support; see [manual testing](manual-testing.md) for the local editor walkthrough. Do not treat source checks as a claim that the candidate is available in npm, n8n Cloud, or the Creator Portal.

## Latest published release

- Package: `n8n-nodes-sleeper`
- Stable version: `0.2.1`
- Default selector: `n8n-nodes-sleeper`
- Secondary selector: `n8n-nodes-sleeper@next`
- Exact selector: `n8n-nodes-sleeper@0.2.1`
- Status: stable/default release on npm; ongoing self-hosted compatibility testing is welcome
- Coverage: 18 direct operations across 14 resources and four Phase 1 trigger events
- Scope of published `0.2.1`: read-only NFL-focused public Sleeper data with no credentials
- Distribution: npm `latest → 0.2.1` and `next → 0.2.0`; the default installer receives `0.2.1`.
  Creator Portal and n8n Cloud updates for `0.2.1` remain separate owner-managed steps and are not
  claimed complete.

These selectors describe the last verified published registry state, checked on 2026-10-07. Confirm
the registry before installing because tags can change independently of this repository.

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
- NFL defaults and NFL state regression; NBA state and supported seasonal listings; NHL state and position notice/preflight; NBA/NHL player catalog output modes; supported NBA trending operations; explicit-season and transaction-round behavior; and exact traded-pick opaque IDs
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

## Candidate coverage and limitations

- The unpublished `0.3.0` source supports the NFL/NBA/NHL player catalog, NFL/NBA trending, observed NFL/NBA seasonal user listings, and NFL/NBA/NHL state. Published `0.2.1` remains NFL-focused until a later package is approved and published.
- Stable/default `0.2.1` includes all four trigger events.
- NHL Position is hidden and nonempty stale values fail locally because tested NHL position filters returned empty results. NHL trending and NHL seasonal user league/draft support are not advertised. NBA seasonal listings are live-observed despite Sleeper documentation still saying NFL only.
- **Player → Get Many** can return a large map. NHL state omits `leg` and `league_season`; no missing field is inferred. NBA transaction rounds are explicit and are not auto-selected from state. The existing NFL Week Changed trigger remains NFL-specific; no NBA/NHL week trigger was added. Use server-side filters, avoid unnecessary
  polling, and generally fetch the full player map no more than once daily.
- The 2026-10-06 lockfile snapshot reported 27 open Dependabot alerts, all development-only. Consult
  the live [Dependabot dashboard](https://github.com/christopherjnelson/n8n-nodes-sleeper/security/dependabot)
  for current counts; these counts are a dated observation, not current alert status.
- The published npm tags described in the dated `0.2.1` release section remain historical until the `0.3.0` candidate is explicitly approved and published. Do not use those selectors as evidence of candidate availability.

## Success criteria

Ongoing compatibility confidence benefits from feedback demonstrating:

- multiple clean installations
- successful loading in more than one supported n8n environment
- no confirmed data corruption, packaging failure, or node-loading failure
- no security regression
- no unresolved high-severity release blocker

These are ongoing testing goals, not claims about tester counts already achieved or gates on the
completed stable promotion.
