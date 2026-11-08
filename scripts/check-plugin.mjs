// Check the source plugin, or an installed copy, against the exact runtime payload.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { lockedFiles } from './vendor-agent-hooks.mjs'

const gitleaks = 'vendor/agent-hooks/vendor/gitleaks'
export const pluginFiles = [
  '.codex-plugin/plugin.json', 'LICENSE', 'NOTICE', 'assets/icon.png',
  '.mcp.json', 'bin/actera-hook.mjs', 'bin/actera-mcp.mjs', 'hooks/hooks.json',
  ...['connect', 'status', 'mode', 'disconnect'].flatMap(skill => [`skills/actera-${skill}/SKILL.md`, `skills/actera-${skill}/agents/openai.yaml`]),
  ...lockedFiles().map(file => `vendor/agent-hooks/${file}`),
].sort()
const source = resolve(fileURLToPath(new URL('../plugins/actera/', import.meta.url)))

async function filesAt(root, prefix = '') {
  const result = []
  for (const entry of await readdir(resolve(root, prefix), { withFileTypes: true })) {
    const name = prefix + entry.name
    assert.ok(!entry.isSymbolicLink(), `Plugin must be self-contained: ${name}`)
    if (entry.isDirectory()) result.push(...await filesAt(root, name + '/'))
    else result.push(name)
  }
  return result.sort()
}

export async function checkPlugin(root = source) {
  root = resolve(root)
  assert.deepEqual(await filesAt(root), pluginFiles, 'Plugin must contain exactly the runtime files and licenses')
  for (const file of pluginFiles)
    assert.ok((await readFile(resolve(root, file))).equals(await readFile(resolve(source, file))), `Installed file differs: ${file}`)
  const bundles = JSON.parse(await readFile(resolve(root, gitleaks, 'manifest.json'), 'utf8'))
  const hash = bytes => createHash('sha256').update(bytes).digest('hex')
  for (const entry of Object.values(bundles.binaries)) {
    const bytes = await readFile(resolve(root, gitleaks, entry.file))
    assert.equal(hash(bytes), entry.compressedSha256)
    assert.equal(hash(gunzipSync(bytes)), entry.sha256)
  }
  const manifest = JSON.parse(await readFile(resolve(root, '.codex-plugin/plugin.json'), 'utf8'))
  console.log(`Plugin ${manifest.version}: ${pluginFiles.length} runtime/license files verified at ${root}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await checkPlugin(process.argv[2])
