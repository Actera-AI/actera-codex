# Installation checks

The marketplace is a catalog in this repository, `.agents/plugins/marketplace.json`.
Codex installs a cached copy of `plugins/actera` from the repository's default
branch and keys the cache by the plugin's version.

## Repository access

Codex fetches the marketplace with the machine's Git configuration. The
repository is public, so no credentials are needed. A private fork or mirror
needs Git authentication first: for HTTPS, configure a credential helper
(`gh auth login` followed by `gh auth setup-git` is one option); an SSH key loaded
in `ssh-agent` also works.

The marketplace contains no Actera machine key. Installation and connecting to
Actera are separate steps, and a reviewer links their own Actera account only when
approval is needed.

## Before merging a version bump

Run from a clean checkout:

```sh
npm test
npm run check:plugin
npm run check:release
```

Then install the checkout into a disposable Codex home, never your own:

```sh
export CODEX_HOME="$(mktemp -d)"
codex plugin marketplace add ./
codex plugin add actera@actera
node scripts/check-plugin.mjs "$CODEX_HOME/plugins/cache/actera/actera/<version>"
```

The checker compares every installed runtime and license file, and the scanner
checksums, with the checkout, and rejects extra or missing files. CI runs the same
install on Linux, macOS and Windows for every pull request. After a merge to
`main`, it also installs from the GitHub repository.

## Host acceptance

On a supported Codex host, verify connecting (browser approval and a setup code),
trusting the hooks, an allowed call, a blocked call, a held call approved in
Codex and one approved in Actera, a held call in `codex exec`, an unavailable
API, a queued report flush, disconnecting, and a plugin update. CI does not
exercise the full host and service path.

Local hooks can be disabled or fail to start, and Codex lets a call run when a hook
fails. Actera's decision is advisory in that case; mandatory enforcement belongs in
managed hooks or an application-owned gateway.
