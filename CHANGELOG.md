# Changelog

## 0.1.0

- Skills: `$actera-connect` (browser approval or a setup code), `$actera-status`,
  `$actera-mode` and `$actera-disconnect`. No machine key is handled by hand.
- Held calls name where to review them, and a rejection carries the reviewer's reason.
- Status reports when no hook has run, which means Codex has not trusted them yet.
- CI tests the vendored package and installs the plugin with the Codex CLI.

## 0.0.1

Spike: Codex hooks check every local tool call with Actera, hold calls that
need approval, and report outcomes from the Codex session transcript.
