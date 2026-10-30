# Actera for Codex

Check Codex tool calls against Actera policies before they run, hold calls that
need approval until a reviewer decides, and report each call's outcome. The plugin
uses Codex hooks; it covers shell commands, file edits (`apply_patch`), MCP tools and
other local tools. Hosted tools such as web search do not run hooks.

Licensed under [Apache-2.0](LICENSE). The Actera service requires an account.

## Status

Spike. Tested with Codex CLI 0.165 on Windows. Not yet released.

## Installation

Requires Node.js 22+ and a Codex version with plugin hooks.

```sh
codex plugin marketplace add Actera-AI/actera-codex
codex plugin add actera@actera
```

Codex runs a plugin's hooks only after you review and trust them. Open `/hooks` in
Codex and trust the Actera hooks; Codex asks again after every plugin update. Until
then Codex skips them without a warning and no tool call is checked. Organizations
can avoid this by deploying the same hooks as managed hooks in `requirements.toml`.

Connect the plugin to an agent with the agent's machine key from Actera, then choose
a mode:

```sh
node <plugin root>/bin/actera-hook.mjs setup --agent-id <agent> --api-key-stdin < key.txt
node <plugin root>/bin/actera-hook.mjs mode enforcing
```

The plugin root is listed by `codex plugin list`. The default mode is **Monitoring**:
every tool call creates a Decision and nothing is blocked.

## Behavior

In **Enforcing** mode:

- A blocked call is denied with the reason from Actera.
- A call that needs approval waits while Actera notifies reviewers in Actera, Slack or
  email. Approval releases it; rejection denies it. After 540 seconds without a decision
  the call is denied, and an identical retry within an hour reuses the approval once.
- When Actera cannot be reached, calls are denied unless you choose
  `evaluation-failure allow`.

Codex lets a call run when a hook crashes or exceeds its timeout, so a broken
installation fails open. Execution reports use the call's status from the Codex
session transcript: `SUCCESS`, `FAILURE`, or `UNKNOWN` when the record is missing.

State lives under `~/.actera/codex`. Tool inputs are scanned locally with the bundled
Gitleaks engine before anything is sent; prompts and tool output are never sent.

## Development

```sh
npm test
npm run check:plugin
```

The hook bridge, delivery worker and scanner come from the agent-hooks package,
vendored under `plugins/actera/vendor/agent-hooks` and pinned by SHA-256 in
`scripts/agent-hooks.lock.json`. Change them in that package, run `npm pack` there,
then `npm run vendor:agent-hooks -- <archive.tgz>` here.
