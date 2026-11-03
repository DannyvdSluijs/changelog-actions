# Agent instructions

## Commits

- Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `<type>(<optional scope>): <description>`.
  - Types: `feat`, `fix`, `docs`, `test`, `refactor`, `build`, `ci`, `chore`.
  - Scopes: `update` or `release` for changes to one action; omit the scope for shared code.
  - Description in the imperative, lower case, no trailing period, e.g. `feat(release): mark pre-release versions as GitHub pre-releases`.
- Commit in small chunks: one logical change per commit, with its tests in the same commit.
- Rebuild and commit `update/dist` and `release/dist` in the same commit as the source change that affects them; CI fails when they are out of date.

## Pull requests

- The PR title becomes the `CHANGELOG.md` entry verbatim when the PR merges, so write it for users of the actions, in the same Conventional Commits form.
- The label picks the changelog category: `enhancement` → Added, `bug` → Fixed, `security` → Security, anything else → Changed.

## Development

- `npm run all` runs typecheck, tests and the build.
- Without a local Node 24, run npm in a container:
  `docker run --rm -v "$PWD":/app -w /app node:24-alpine npm run all`
