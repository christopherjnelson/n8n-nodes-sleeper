# n8n-nodes-sleeper

> [!IMPORTANT]
> This is an unofficial community project and is not affiliated with, endorsed by, or
> sponsored by Sleeper or Blitz Studios.

`n8n-nodes-sleeper` is an n8n community node for retrieving public Sleeper fantasy
football user, league, and NFL state data.

## Status and scope

This project is in early development and has not been published to npm. It is read-only,
requires no credentials, and is NFL-first.

## Operations

| Resource | Operation         | Required inputs              | Output shape                                                    |
| -------- | ----------------- | ---------------------------- | --------------------------------------------------------------- |
| User     | Get               | Username or User ID          | One item containing the raw Sleeper user object                 |
| League   | Get               | League ID                    | One item containing the raw Sleeper league object               |
| League   | Get Many for User | User ID, Sport (NFL), Season | One item per raw Sleeper league; an empty result emits no items |
| Sport    | Get State         | Sport (NFL)                  | One item containing the raw Sleeper state object                |

Sleeper usernames may change. Store the stable `user_id` returned by **User → Get** for
later workflow steps, including **League → Get Many for User**, which accepts only a user ID.
Treat Sleeper user and league IDs as strings so JavaScript does not round large values.

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
