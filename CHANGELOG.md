# Changelog

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
