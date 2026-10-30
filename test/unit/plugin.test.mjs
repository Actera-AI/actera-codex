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
  const command = 'node "${PLUGIN_ROOT}/bin/actera-hook.mjs" hook'
  assert.deepEqual(Object.keys(hooks).sort(), ['PostToolUse', 'PreToolUse'])
  for (const event of Object.values(hooks)) {
    assert.equal(event.length, 1)
    assert.equal(event[0].matcher, undefined, 'No matcher: every tool is checked')
    assert.deepEqual(event[0].hooks.map((hook) => [hook.type, hook.command]), [['command', command]])
  }
  // The adapter's default hold (540 s) must end before Codex kills the hook.
  assert.equal(hooks.PreToolUse[0].hooks[0].timeout, 600)
  const shim = await readFile(new URL('../../plugins/actera/bin/actera-hook.mjs', import.meta.url), 'utf8')
  assert.match(shim, /^import '\.\.\/vendor\/agent-hooks\/src\/hosts\/codex\/cli\.mjs'$/m)
})

test('the marketplace lists this plugin and the manifest names its hooks file', async () => {
  const marketplace = await json('.agents/plugins/marketplace.json')
  assert.deepEqual(marketplace.plugins.map((p) => [p.name, p.source]), [['actera', { source: 'local', path: './plugins/actera' }]])
  const manifest = await json('plugins/actera/.codex-plugin/plugin.json')
  assert.equal(manifest.name, 'actera')
  assert.equal(manifest.hooks, './hooks/hooks.json')
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
