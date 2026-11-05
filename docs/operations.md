# Operating the Codex integration

Use `$actera-status` in Codex to see the connection, mode, failure behavior, hook
activity and delivery status. For diagnostics, run the plugin's command line with
Node.js. In an installed plugin it is `bin/actera-hook.mjs` in the plugin folder;
in this repository it is `plugins/actera/bin/actera-hook.mjs`:

```sh
node plugins/actera/bin/actera-hook.mjs status
node plugins/actera/bin/actera-hook.mjs flush
```

`status` shows the connection, `lastHook` (the last hook Codex ran), queue depth,
and the last delivery error. `hooksNeedAttention` means no Actera hook has run
yet: open `/hooks` in Codex, trust the two Actera hooks, and start a new session.
Codex asks again after every plugin update, and an existing session keeps the
hooks it started with.

## Hooks and enforcement

`PreToolUse` runs as an `mcp_tool` hook on the plugin's MCP server, `actera`, so a
held call can ask the person to allow or deny it. The model cannot see or call
that server's tool. `PostToolUse` runs as a command hook and queues the
execution report. Outcomes come from the Codex session transcript: `SUCCESS`,
`FAILURE`, or `UNKNOWN` when the record is missing.

Codex lets a call run when a hook fails, exceeds its timeout or cannot reach the
MCP server, so a broken installation fails open. For mandatory enforcement,
deploy the same hooks as managed hooks in `requirements.toml`. Hosted tools such
as web search do not run hooks.

## Held calls and reviewer linking

In Enforcing mode, a call that needs approval waits while Actera notifies
reviewers in Actera, Slack or email. The first held call offers to link Codex to
the person's Actera account in the browser. To link ahead of time, run
`node plugins/actera/bin/actera-hook.mjs link`, open the printed URL, sign in, and
select **Link this account**. Check with `link-status`.

Once linked, Codex asks to allow the held call once or deny it. Actera checks that
the person may approve it and records the choice, and a decision made in Actera
meanwhile closes the prompt. Choosing to wait for a reviewer holds the call. After
540 seconds without a decision the call is denied, and an identical retry in the
same session within an hour reuses the approval once.

Codex cannot show the prompt in Full access (approval policy `never`) or in
`codex exec`. There, and when the prompt is dismissed, the call is denied at once
with a reason that asks for approval in Actera. Retry it once it is approved.

Linking ends when the browser session expires, on sign-out, after eight hours, or
when the connection is disabled. The reviewer credential lives in `reviewer.json`
in the bridge state directory. Someone who can read that file or modify the
plugin may misuse its delegated authority.

## Mode and evaluation failures

`$actera-mode` switches between **Monitoring** (default) and **Enforcing**, and
chooses what happens when Actera cannot evaluate a call: **block** (fail closed,
default) or **allow** (fail open). The failure choice applies only in Enforcing;
explicit denials and required approvals stay enforced either way. Both settings
live in the bridge state directory, survive reconnecting, and apply to the next
tool call. Policy configuration in Actera never changes them.

## Captured input

Tool inputs are scanned locally with the bundled Gitleaks engine, and known
sensitive field names are redacted, before anything is queued or sent. Detection
is best effort; ordinary commands and file paths stay visible. Prompts and tool
output are never sent. Decisions include `context.input_capture` with the capture
status and redacted JSON pointer paths. Inputs over 512 KiB are omitted. If the
scanner cannot start or fails, no raw values are sent: Monitoring records the call
with omitted inputs, and Enforcing treats it as an evaluation failure.

Policies read Codex's session details under `context.codex`, such as
`context.codex.permission_mode` and `context.codex.cwd`.

## Offline delivery

Hooks save reports durably and hand delivery to one background worker per bridge
directory. Failures retry with backoff; `flush` retries at once. The queue holds
up to 128 reports. When it is full, reporting fails visibly in status, and policy
checks still run. Reports keep their idempotency key across retries.

A new connection archives the previous key and its undelivered reports under
`~/.actera/codex/archived/`; they are not sent with the new key. The archive can
contain tool inputs, so keep it private and review it before removing it.

## Disconnecting and removing the plugin

Run `$actera-disconnect` before removing the plugin. It sends queued reports,
ends the connection in Actera so the key stops working, stops the delivery worker
and scanner helper, and deletes `~/.actera/codex`, including the machine key,
reviewer link and archives. If reports cannot be sent, it stops without deleting
anything; `--discard` deletes them instead. If Actera cannot be reached, local
state is still removed and the agent should be disconnected on its page in
Actera. Then remove the plugin:

```sh
codex plugin remove actera@actera
```

Removing the plugin without disconnecting leaves local state in place and the
connection active in Actera. The agent's connection card shows when its key was
last used; disconnect it there.

## Credential rotation

If the machine key is lost or compromised, disconnect the agent in Actera, then
run `$actera-connect --reconnect` and approve the previous agent to keep its
identity and policies. Disconnecting revokes the old key and its reviewer links;
link the reviewer again.
