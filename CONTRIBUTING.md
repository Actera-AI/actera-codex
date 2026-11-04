# Contributing

Open a pull request with the problem, the resulting behavior, and the checks you
ran. Keep unrelated changes separate. Run these checks with Node.js 22+ and the
Codex CLI:

```sh
npm test
npm run check:plugin
npm run check:release
```

Let CI pass before merging; `ci-result` is the required check. `test/unit`
contains offline tests. CI also installs the plugin from the checkout with the
Codex CLI on Linux, macOS and Windows, and compares the installed copy with the
source. Never put contributor tests or tooling in the installed payload under
`plugins/actera`.

Use synthetic fixtures. Do not commit credentials, customer data, captured
sessions, local configuration, or build caches. CI scans the Git history for
secrets with Gitleaks, which does not replace review.

## The vendored hook package

The hook bridge, pairing, delivery worker, input capture and bundled scanner come
from the [agent-hooks package](https://github.com/Actera-AI/actera-agent-hooks),
vendored under `plugins/actera/vendor/agent-hooks`. Only the core and the Codex
adapter are vendored. Change them in that package and release it, then move this
plugin to the release in the pull request that needs it:

```sh
npm run vendor:agent-hooks -- --version <x.y.z>
```

The script downloads the release, verifies its SHA-256, and records the release
and every file's SHA-256 in `scripts/agent-hooks.lock.json`. `npm test` rejects
any vendored file that differs. Do not edit vendored files in place. The package
owns the API contract snapshot, scanner sources and their checks.

To try an unreleased change, `npm run vendor:agent-hooks -- --from ../actera-agent-hooks`
vendors a local checkout. CI refuses a lock from a local pack, so vendor a release
before merging. `npm run check:release` downloads the named release, checks the
vendored files against it, and warns when a newer release exists.

## Local development

The plugin connects to the hosted service defined in
`plugins/actera/vendor/agent-hooks/src/core/defaults.mjs`; users never choose an
endpoint. For local development, set `ACTERA_API_ORIGIN` (HTTPS, or HTTP on
loopback) in the shell that launches Codex, then run `$actera-connect`. The
override applies only at pairing time and is stored as that connection's
`baseUrl`, so switching services means reconnecting. The connect output names the
override when one is active. Set `ACTERA_CODEX_BRIDGE_HOME` to keep a test
connection apart from your own `~/.actera/codex`. Keep the test agent, machine
key, and bridge state outside the repository.

## Changes and releases

Describe user-visible changes in `CHANGELOG.md` and bump the version in
`plugins/actera/.codex-plugin/plugin.json` in the same pull request. Codex
installs the plugin from `main` and caches it by version, so a merged version is
what users get on their next update. Follow the
[installation checks](docs/installation-checks.md) before merging a version bump.
Participation is governed by the [code of conduct](CODE_OF_CONDUCT.md).
