import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import test from 'node:test'

// The package OpenAI's plugin directory accepts: one remote MCP server, a skill,
// no hooks, and listing fields within the portal's limits.
const root = new URL('../../openai-directory/', import.meta.url)
const json = async (name) => JSON.parse(await readFile(new URL(name, root), 'utf8'))

async function files(dir = root, prefix = '') {
  const found = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = prefix + entry.name
    if (entry.isDirectory()) found.push(...(await files(new URL(entry.name + '/', dir), path + '/')))
    else found.push(path)
  }
  return found.sort()
}

// A PNG's width and height, from its IHDR chunk.
function pngSize(bytes) {
  assert.equal(bytes.subarray(1, 4).toString('latin1'), 'PNG')
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)]
}

test('the directory package holds only the manifest, the MCP server, one skill and its icons', async () => {
  assert.deepEqual(await files(), ['assets/icon.png', 'assets/logo.png', 'mcp.json', 'plugin.json', 'skills/agent-policies/SKILL.md'])
})

test('the plugin connects to the production MCP server with CIMD and nothing else', async () => {
  const { mcpServers } = await json('mcp.json')
  assert.deepEqual(Object.keys(mcpServers), ['actera'])
  const server = mcpServers.actera
  assert.deepEqual([server.type, server.url], ['streamable-http', 'https://mcp.actera.dev/mcp'])
  assert.deepEqual(server.extensions['com.openai'].auth, { type: 'oauth', client: { mode: 'cimd' } })
  assert.equal(server.headers, undefined, 'Public submission refuses server headers')
})

test('the listing fits the portal limits', async () => {
  const manifest = await json('plugin.json')
  assert.match(manifest.name, /^[a-z0-9]+(-[a-z0-9]+)*$/)
  assert.ok(manifest.description.length <= 1024)
  const { interface: listing, review, publication } = manifest.extensions['com.openai']
  assert.ok(listing.displayName.length <= 30)
  assert.ok(listing.shortDescription.length <= 30)
  assert.ok(listing.longDescription.length <= 4000)
  assert.ok(listing.capabilities.length <= 20 && listing.capabilities.every((item) => item.length <= 120))
  assert.ok(listing.defaultPrompt.length <= 3 && listing.defaultPrompt.every((prompt) => prompt.length <= 128 && !prompt.includes('@')))
  for (const key of ['websiteURL', 'supportURL', 'privacyPolicyURL', 'termsOfServiceURL']) assert.match(listing[key], /^https:\/\/\S+$/, key)
  for (const key of ['brandColor', 'brandColorDark']) assert.match(listing[key], /^#[0-9A-F]{6}$/, key)
  const categories = ['Productivity', 'Creativity', 'Developer Tools', 'Business & Operations', 'Data & Analytics', 'Communication', 'Education & Research', 'Security', 'Finance', 'Healthcare', 'Travel', 'Entertainment', 'Other']
  assert.ok(categories.includes(listing.category))
  // Initial review needs exactly five positive and three negative cases, and release notes.
  assert.equal(review.test_cases.positive.length, 5)
  assert.equal(review.test_cases.negative.length, 3)
  for (const item of review.test_cases.positive) for (const key of ['description', 'prompt', 'tools_triggered', 'expected_behavior']) assert.ok(item[key], key)
  assert.ok(publication.release_notes)
  const copy = JSON.stringify(manifest) + (await readFile(new URL('skills/agent-policies/SKILL.md', root), 'utf8'))
  assert.doesNotMatch(copy, /—/, 'No em dashes in listing copy')
})

test('icons are square PNGs the portal accepts', async () => {
  const { interface: listing } = (await json('plugin.json')).extensions['com.openai']
  for (const key of ['logo', 'composerIcon']) {
    const bytes = await readFile(new URL(listing[key], root))
    const [width, height] = pngSize(bytes)
    assert.equal(width, height, key)
    assert.ok(width >= 48 && width <= 4096, key)
    assert.ok(bytes.length <= 5 * 1024 * 1024, key)
  }
})

test('the skill names itself and says when to use it', async () => {
  const skill = await readFile(new URL('skills/agent-policies/SKILL.md', root), 'utf8')
  const front = skill.match(/^---\nname: (.+)\ndescription: (.+)\n---\n/)
  assert.ok(front, 'front matter')
  assert.equal(front[1], 'agent-policies')
  assert.ok(front[2].length <= 1024)
})
