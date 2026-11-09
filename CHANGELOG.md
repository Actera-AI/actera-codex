# Changelog

## 0.2.5

- The plugin manifest names its repository and ships an Actera icon for the Codex
  plugin list. Behavior is unchanged.

## 0.2.4

- When a workspace reaches its monthly decisions, the plugin waits until Actera accepts
  requests again instead of retrying every 30 seconds, and status explains why.
- Vendors `@actera-ai/agent-hooks` 0.4.1.

## 0.2.3

- `$actera-disconnect` also ends the connection in Actera, so the agent shows as
  disconnected and its key stops working. If Actera cannot be reached, local state is still
  removed and the skill says to disconnect the agent in Actera.
- Vendors `@actera-ai/agent-hooks` 0.4.0.

## 0.2.2

- Vendors only the core and the Codex adapter of `@actera-ai/agent-hooks` 0.3.3, taken
  from its published release. Behavior is unchanged.

## 0.2.1

- A held call no longer leaves Codex on "thinking" for up to 540 seconds when Codex cannot
  show the review prompt (Full access, `codex exec`) or you dismiss it. The call is denied
  at once and Codex tells you it needs approval in Actera; a retry after approval runs.
- Vendors `@actera-ai/agent-hooks` 0.3.3.

## 0.2.0

- Review held calls in Codex. The `PreToolUse` check now runs on the plugin's MCP
  server (`.mcp.json`, `bin/actera-mcp.mjs`) as an `mcp_tool` hook, so a held call can
  ask the person to allow it once or deny it. The first held call offers to link Codex to
  their Actera account. Codex asks to trust the changed hook again.
- An approved call no longer shows "Hook failed" in Codex.
- `$actera-status` reports whether Codex is linked for reviews.
- Vendors `@actera-ai/agent-hooks` 0.3.0.

## 0.1.0

- Skills: `$actera-connect` (browser approval or a setup code), `$actera-status`,
  `$actera-mode` and `$actera-disconnect`. No machine key is handled by hand.
- Held calls name where to review them, and a rejection carries the reviewer's reason.
- Status reports when no hook has run, which means Codex has not trusted them yet.
- CI tests the vendored package and installs the plugin with the Codex CLI.

## 0.0.1

Spike: Codex hooks check every local tool call with Actera, hold calls that
need approval, and report outcomes from the Codex session transcript.
