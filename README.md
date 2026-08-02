# n8n-nodes-sleeper

> [!IMPORTANT]
> This is an unofficial community project and is not affiliated with, endorsed by, or
> sponsored by Sleeper or Blitz Studios.

`n8n-nodes-sleeper` is an n8n community node for retrieving public Sleeper fantasy
football data, including league, roster, matchup, transaction, draft, and player data.

## Status and scope

This project is in early development and has not been published. It is read-only, requires
no credentials, and is NFL-first. API operations are not implemented yet.

The project intentionally does not support:

- Lineup changes
- Adds or drops
- Trades
- Draft actions
- League-setting changes
- Chat
- Sleeper Picks or paid contests

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
