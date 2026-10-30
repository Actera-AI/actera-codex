---
name: actera-disconnect
description: Disconnect this Codex installation from Actera and remove the plugin's local state.
---

The Actera plugin's command line is `bin/actera-hook.mjs` in the plugin folder, two levels above the folder that holds this `SKILL.md`. Run `node "<plugin folder>/bin/actera-hook.mjs" disconnect` with its absolute path. Append `--discard` only when the person explicitly asks to discard undelivered reports.

The command first sends queued tool outcomes and policy checks. If some could not be delivered, tell the person how many and the error, and that nothing was removed. They can retry later, or ask to disconnect with `--discard` to delete them. Never add `--discard` on your own.

After success, tell the person that this machine's Actera key, settings and queued reports were removed. The plugin stays installed but checks nothing until `$actera-connect` runs again; to remove it, run `codex plugin remove actera@actera` in a terminal. Disconnecting does not revoke the agent's key in Actera, so an administrator should disconnect it on the agent's page if this machine should no longer report.
