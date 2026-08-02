# n8n-nodes-sleeper

> [!IMPORTANT]
> This is an unofficial community project and is not affiliated with, endorsed by, or
> sponsored by Sleeper or Blitz Studios.

`n8n-nodes-sleeper` is an n8n community node for retrieving public Sleeper fantasy
football user, league, roster, matchup, transaction, playoff, traded-pick, and NFL state
data.

## Status and scope

This project is in early development and has not been published to npm. It is read-only,
requires no credentials, and is NFL-first.

## Operations

| Resource    | Operation         | Required inputs              | Purpose and output shape                                           |
| ----------- | ----------------- | ---------------------------- | ------------------------------------------------------------------ |
| User        | Get               | Username or User ID          | Retrieve one raw Sleeper user object                               |
| League      | Get               | League ID                    | Retrieve one raw Sleeper league object                             |
| League      | Get Many for User | User ID, Sport (NFL), Season | Retrieve one raw item per league; an empty result emits no items   |
| League User | Get Many          | League ID                    | Retrieve one raw item per user participating in the league         |
| Roster      | Get Many          | League ID                    | Retrieve one raw item per league roster                            |
| Matchup     | Get Many          | League ID, Week              | Retrieve one raw item per roster side for the selected week        |
| Transaction | Get Many          | League ID, Round or Week     | Retrieve one raw item per free-agent, waiver, or trade transaction |
| Playoff     | Get Bracket       | League ID, Bracket Type      | Retrieve one raw item per winners- or losers-bracket matchup       |
| Traded Pick | Get Many          | League ID                    | Retrieve one raw item per traded pick                              |
| Sport       | Get State         | Sport (NFL)                  | Retrieve one raw Sleeper state object                              |

Sleeper usernames may change. Store the stable `user_id` returned by **User → Get** for
later workflow steps, including **League → Get Many for User**, which accepts only a user ID.
Treat Sleeper IDs as strings so JavaScript does not round large values.

Direct operations preserve Sleeper's raw fields, nested objects, arrays, and null values.
League users and rosters remain separate results: the node does not join users to roster
ownership. **Matchup → Get Many** returns team-side records and does not pair records that
share a `matchup_id`. **Transaction → Get Many** uses Sleeper's `round` path parameter, which
commonly corresponds to the NFL week, without selecting a current week automatically.
**Playoff → Get Bracket** supports controlled winners and losers bracket choices.

The project intentionally does not support:

- Lineup changes
- Adds or drops
- Trades
- Draft actions
- League-setting changes
- Chat
- Sleeper Picks or paid contests
- Player-map retrieval
- Triggers

## Development

Node.js 22.22.0 or newer and pnpm 11 are required.

```bash
pnpm install --frozen-lockfile
pnpm run validate
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run test
pnpm run build
npm pack --dry-run
```

Use `pnpm run lint:fix` and `pnpm run format:write` for supported automatic fixes. See
[CONTRIBUTING.md](CONTRIBUTING.md) for contribution policies.

## Resources

- [Sleeper API documentation](https://docs.sleeper.com/)
- [n8n community-node documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

MIT. See [LICENSE](LICENSE).
