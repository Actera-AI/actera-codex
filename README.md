# Actera for Codex

Check Codex tool calls against Actera policies before they run, hold calls that
need approval until a reviewer decides, and report each call's outcome. The plugin
uses Codex hooks; it covers shell commands, file edits (`apply_patch`), MCP tools and
other local tools. Hosted tools such as web search do not run hooks.

Licensed under [Apache-2.0](LICENSE). The Actera service requires an account.

## Status

Alpha. CI installs the plugin with the Codex CLI on Linux, macOS and Windows; host
testing so far is on Windows with the Codex CLI 0.165 and later. Behavior and settings
can change between minor versions before 1.0; see [CHANGELOG.md](CHANGELOG.md).

## Installation

Requires Node.js 22+ and the Codex CLI or app. In a terminal:

```sh
codex plugin marketplace add Actera-AI/actera-codex
codex plugin add actera@actera
```

Then, in Codex:

1. Run `$actera-connect`. A browser page opens for a workspace administrator to name a
   new agent or choose an existing one. Confirm that the code on the page matches the one
   Codex shows. With a setup code from the Actera Overview, run `$actera-connect <code>`
   instead; it connects to the agent the code was made for, with no browser page.
2. Open `/hooks`, trust the two Actera hooks, and start a new session. Codex skips a
   plugin's hooks until they are trusted, and asks again after each plugin update.
3. Use any tool. Each call appears in Actera's Decisions.

Connecting needs to reach Actera and write to `~/.actera/codex`, so Codex may ask to
run the connect command outside its sandbox. No API URL or machine key is needed; the
plugin never displays the key.

## Skills

| Skill | Does |
| --- | --- |
| `$actera-connect [setup code]` | Connects this Codex to an Actera agent. `--reconnect` replaces an existing connection. |
| `$actera-status` | Shows the connection, mode, whether the hooks run, and reports waiting to be sent. |
| `$actera-mode` | Switches between Monitoring and Enforcing, and chooses what happens when Actera cannot evaluate. |
| `$actera-disconnect` | Sends queued reports, ends the connection in Actera, and removes this machine's connection. |

The default mode is **Monitoring**: every tool call creates a Decision and nothing is
blocked. In **Enforcing**:

- A blocked call is denied with the reason from Actera.
- A call that needs approval waits while Actera notifies reviewers in Actera, Slack or
  email; Codex shows "Checking with Actera" meanwhile. Approval releases the call;
  rejection denies it with the reviewer's reason.
- You can review held calls in Codex too. The first held call offers to link Codex to
  your Actera account in the browser; after that, Codex asks you to allow each held call
  once or deny it. Actera checks that you may approve it and records your choice, and a
  decision made in Actera meanwhile closes the prompt. Choosing to wait for a reviewer
  holds the call as above. After 540 seconds without a decision the call is denied, and
  an identical retry in the same session within an hour reuses the approval once.
- Codex cannot show the prompt in Full access (approval policy `never`) or in
  `codex exec`. There, and when you dismiss the prompt, the call is denied at once and
  Codex tells you it needs approval in Actera. Retry it once it is approved.
- When Actera cannot be reached, calls are denied unless you choose to fail open with
  `$actera-mode`.

The check runs as an `mcp_tool` hook on the plugin's own MCP server, `actera`, because a
command hook cannot ask anything in Codex. The model cannot see or call that server's
tool. Codex lets a call run when a hook fails, exceeds its timeout or cannot reach the
MCP server, so a broken installation fails open. For mandatory enforcement, deploy the same hooks as managed
hooks in `requirements.toml`. Execution reports use each call's status from the Codex
session transcript: `SUCCESS`, `FAILURE`, or `UNKNOWN` when the record is missing.

Tool inputs are scanned locally with the bundled Gitleaks engine and sensitive fields
are redacted before anything is sent; prompts and tool output are never sent. Policies
read Codex's session details under `context.codex`, such as
`context.codex.permission_mode` and `context.codex.cwd`. State lives under
`~/.actera/codex`.

See [operations](docs/operations.md) for status, reviewer linking, delivery,
disconnecting and credential rotation.

## Updates

The marketplace follows `main`, and Codex caches the plugin by version. To update:

```sh
codex plugin marketplace upgrade actera
codex plugin add actera@actera
```

Then trust the updated hooks in `/hooks` and start a new session. Codex keeps running
the previous hooks until you do. See [installation checks](docs/installation-checks.md).

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for the checks, local development against your
own Actera API, and updating the vendored hook package. Development files stay outside
the installed plugin; it contains the hooks, skills, MCP server, vendored bridge,
scanner bundles and licenses.

## Security

Report vulnerabilities privately to [hello@actera.dev](mailto:hello@actera.dev). See
[SECURITY.md](SECURITY.md) for what to include.
