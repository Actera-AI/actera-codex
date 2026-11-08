import assert from 'node:assert/strict'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { checkPlugin, pluginFiles } from '../../scripts/check-plugin.mjs'
import { checkVendored } from '../../scripts/vendor-agent-hooks.mjs'

const json = async (name) => JSON.parse(await readFile(new URL('../../' + name, import.meta.url), 'utf8'))

test('every tool call goes through the vendored Codex adapter, with time to hold for approval', async () => {
  const { hooks } = await json('plugins/actera/hooks/hooks.json')
  assert.deepEqual(Object.keys(hooks).sort(), ['PostToolUse', 'PreToolUse'])
  for (const event of Object.values(hooks)) {
    assert.equal(event.length, 1)
    assert.equal(event[0].matcher, undefined, 'No matcher: every tool is checked')
    assert.equal(event[0].hooks.length, 1)
  }
  // The check runs on the plugin's MCP server so it can ask the person in Codex.
  const [check] = hooks.PreToolUse[0].hooks
  assert.deepEqual([check.type, check.server, check.tool], ['mcp_tool', 'actera', 'pre_tool_use'])
  // Only fields Codex always sends: a missing placeholder fails the hook, which lets the call run.
  const required = ['cwd', 'model', 'permission_mode', 'session_id', 'tool_input', 'tool_name', 'tool_use_id', 'transcript_path', 'turn_id']
  assert.deepEqual(Object.entries(check.input).sort(), required.map((field) => [field, `\${${field}}`]))
  const [report] = hooks.PostToolUse[0].hooks
  assert.deepEqual([report.type, report.command], ['command', 'node "${PLUGIN_ROOT}/bin/actera-hook.mjs" hook'])
  // The adapter's default hold (540 s) must end before Codex ends the hook or the MCP call.
  assert.equal(check.timeout, 600)
  const { mcpServers } = await json('plugins/actera/.mcp.json')
  assert.deepEqual(Object.keys(mcpServers), ['actera'])
  assert.deepEqual([mcpServers.actera.command, mcpServers.actera.args, mcpServers.actera.cwd], ['node', ['bin/actera-mcp.mjs'], '.'])
  assert.equal(mcpServers.actera.tool_timeout_sec, 600)
  assert.deepEqual(mcpServers.actera.omit_tools_from, ['code_mode', 'deferred', 'direct'], 'The model never sees pre_tool_use')
  const shim = await readFile(new URL('../../plugins/actera/bin/actera-hook.mjs', import.meta.url), 'utf8')
  assert.match(shim, /^import '\.\.\/vendor\/agent-hooks\/src\/hosts\/codex\/cli\.mjs'$/m)
  const server = await readFile(new URL('../../plugins/actera/bin/actera-mcp.mjs', import.meta.url), 'utf8')
  assert.match(server, /^import '\.\.\/vendor\/agent-hooks\/src\/hosts\/codex\/mcp-server\.mjs'$/m)
})

test('the marketplace lists this plugin and the manifest names its hooks file', async () => {
  const marketplace = await json('.agents/plugins/marketplace.json')
  assert.deepEqual(marketplace.plugins.map((p) => [p.name, p.source]), [['actera', { source: 'local', path: './plugins/actera' }]])
  const manifest = await json('plugins/actera/.codex-plugin/plugin.json')
  assert.equal(manifest.name, 'actera')
  assert.equal(manifest.hooks, './hooks/hooks.json')
  assert.equal(manifest.mcpServers, './.mcp.json')
  assert.equal(manifest.skills, './skills/')
  assert.equal(manifest.repository, 'https://github.com/Actera-AI/actera-codex')
  // Catalogs that list Codex plugins require a plugin-relative icon of at most 50 KB.
  const icon = await readFile(new URL('../../plugins/actera/' + manifest.interface.composerIcon, import.meta.url))
  assert.ok(icon.length <= 50 * 1024, `composerIcon is ${icon.length} bytes`)
})

// Connect and status may be chosen by Codex from plain words; the skills that
// weaken enforcement or remove the connection run only when the person invokes them.
const explicitOnly = new Set(['mode', 'disconnect'])

test('each skill uses the plugin command line, and only the person can change or remove enforcement', async () => {
  for (const skill of ['connect', 'status', 'mode', 'disconnect']) {
    const body = await readFile(new URL(`../../plugins/actera/skills/actera-${skill}/SKILL.md`, import.meta.url), 'utf8')
    assert.match(body, new RegExp(`^---\nname: actera-${skill}\ndescription: .+\n---\n`))
    assert.match(body, /bin\/actera-hook\.mjs/)
    assert.ok(!/api.?key|ACTERA_API_KEY/i.test(body.replace(/machine key/gi, '')), `${skill} must not handle keys`)
    const policy = await readFile(new URL(`../../plugins/actera/skills/actera-${skill}/agents/openai.yaml`, import.meta.url), 'utf8')
    assert.match(policy, new RegExp(`allow_implicit_invocation: ${!explicitOnly.has(skill)}`))
  }
})

test('the vendored agent-hooks files match the lock', () => {
  checkVendored()
})

test('installation validation rejects extra files and changed runtime code', async () => {
  const stage = await mkdtemp(join(tmpdir(), 'actera-codex-distribution-'))
  try {
    for (const name of pluginFiles) {
      await mkdir(dirname(join(stage, name)), { recursive: true })
      await copyFile(new URL('../../plugins/actera/' + name, import.meta.url), join(stage, name))
    }
    await checkPlugin(stage)
    await writeFile(join(stage, 'notes.txt'), 'development-only')
    await assert.rejects(checkPlugin(stage), /exactly the runtime files/)
    await rm(join(stage, 'notes.txt'))
    await writeFile(join(stage, 'bin/actera-hook.mjs'), '// stale installation')
    await assert.rejects(checkPlugin(stage), /Installed file differs/)
  } finally {
    await rm(stage, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  }
})
