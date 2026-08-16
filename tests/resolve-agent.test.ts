import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findFileWalkingUp, hostSearchRoots, missingHostPluginMessage, packageJsonSearchFiles, resolveHostSpecifier } from '../src/import-host.ts'
import { isSpawnableAgent, resolveAgent, resolveNodeAgentBundle, searchPathForAgent, wellKnownAgentPaths } from '../src/resolve-agent.ts'
import { cursorAcpProviderConfig } from '../src/acp-config.ts'
import { catalogFromOptions, composeCursorModelId, parseCursorModels, splitCursorModelId, withModelArgs } from '../src/models.ts'
import { clashConfigCandidates, clashDirectsNode } from '../src/clash-direct.ts'
import { proxyChildEnv, spawnAgentEnv } from '../src/proxy-env.ts'
import { parseAgentStatus, readProxyEnv } from '../src/readiness.ts'
import { parseCursorAcpSettings } from '../src/settings-schema.ts'
import { cursorAcpStatus } from '../src/status.ts'
import { argsForProbeCommand, parseProbeOutput, PROBE_PROMPT } from '../src/probe.ts'
import { CURSOR_AGENT_WHEN_TO_USE } from '../src/prompt.ts'
import { en, zh } from '../src/client/locales.ts'

describe('searchPathForAgent', () => {
  it('returns undefined for an empty PATH', () => {
    assert.equal(searchPathForAgent(''), undefined)
    assert.equal(searchPathForAgent(undefined), undefined)
  })
})

describe('wellKnownAgentPaths', () => {
  it('includes the official Windows install directory', () => {
    const paths = wellKnownAgentPaths({
      LOCALAPPDATA: 'C:\\Users\\test\\AppData\\Local',
      USERPROFILE: 'C:\\Users\\test',
    })
    assert.equal(paths.some(item => item.path.includes('cursor-agent') && item.source === 'localappdata'), true)
    assert.equal(paths.some(item => item.path.includes('.local') && item.source === 'home-local'), true)
  })
})

describe('resolveNodeAgentBundle', () => {
  it('picks the newest versions/ node.exe + index.js', () => {
    const root = mkdtempSync(join(tmpdir(), 'cursor-agent-'))
    const older = join(root, 'versions', '2026.08.01-aaaaaaa')
    const newer = join(root, 'versions', '2026.08.11-bbbbbbb')
    mkdirSync(older, { recursive: true })
    mkdirSync(newer, { recursive: true })
    writeFileSync(join(older, 'node.exe'), '')
    writeFileSync(join(older, 'index.js'), '')
    writeFileSync(join(newer, 'node.exe'), '')
    writeFileSync(join(newer, 'index.js'), '')
    const resolved = resolveNodeAgentBundle(root)
    assert.equal(resolved?.command, join(newer, 'node.exe'))
    assert.deepEqual(resolved?.args, [join(newer, 'index.js'), 'acp'])
  })
})

describe('resolveAgent', () => {
  it('unwraps LOCALAPPDATA cursor-agent versions', () => {
    const local = mkdtempSync(join(tmpdir(), 'localapp-'))
    const version = join(local, 'cursor-agent', 'versions', '2026.08.11-e8db854')
    mkdirSync(version, { recursive: true })
    writeFileSync(join(version, 'node.exe'), '')
    writeFileSync(join(version, 'index.js'), '')
    const resolved = resolveAgent({ LOCALAPPDATA: local, PATH: '' })
    assert.equal(resolved?.source, 'localappdata')
    assert.equal(resolved?.command, join(version, 'node.exe'))
    assert.deepEqual(resolved?.args, [join(version, 'index.js'), 'acp'])
  })
})

describe('isSpawnableAgent', () => {
  it('rejects a missing path', () => {
    assert.equal(isSpawnableAgent('C:\\definitely-not-agent.exe'), false)
  })
})

describe('import-host', () => {
  it('lists argv, cwd, and here without empties', () => {
    assert.deepEqual(hostSearchRoots(undefined, 'C:\\app', 'C:\\plugin'), ['C:\\app', 'C:\\plugin'])
  })

  it('finds a checkout-relative file by walking up', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-cursor-acp-'))
    const nested = join(root, 'apps', 'desktop', 'lib')
    mkdirSync(nested, { recursive: true })
    const target = join(root, 'packages', 'subagent', 'subagent-acp', 'lib')
    mkdirSync(target, { recursive: true })
    writeFileSync(join(target, 'index.js'), 'export {}\n')
    assert.equal(
      findFileWalkingUp(join(nested, 'electron-main.js'), 'packages/subagent/subagent-acp/lib/index.js'),
      join(target, 'index.js'),
    )
  })

  it('resolves a host package with createRequire from that tree', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-cursor-acp-pkg-'))
    const pkgDir = join(root, 'node_modules', '@deepseek-ai', 'dsh-subagent-acp')
    mkdirSync(join(pkgDir, 'lib'), { recursive: true })
    writeFileSync(join(root, 'package.json'), '{"name":"host","type":"module"}\n')
    writeFileSync(join(pkgDir, 'package.json'), '{"name":"@deepseek-ai/dsh-subagent-acp","type":"module","exports":{".":"./lib/index.js"}}\n')
    writeFileSync(join(pkgDir, 'lib', 'index.js'), 'export const name = "ok"\n')
    const resolved = resolveHostSpecifier('@deepseek-ai/dsh-subagent-acp', join(root, 'package.json'))
    assert.equal(resolved, join(pkgDir, 'lib', 'index.js'))
    mkdirSync(join(root, 'apps', 'cli', 'lib'), { recursive: true })
    writeFileSync(join(root, 'apps', 'cli', 'lib', 'bin.js'), 'export {}\n')
    assert.ok(packageJsonSearchFiles([join(root, 'apps', 'cli', 'lib', 'bin.js')]).includes(join(root, 'package.json')))
  })

  it('names the missing official packages when resolve fails', () => {
    const message = missingHostPluginMessage('@deepseek-ai/dsh-subagent-acp')
    assert.match(message, /cursor_agent is not registered/)
    assert.match(message, /dsh-subagent-acp/)
    assert.match(message, /createRequire/)
  })
})

describe('models', () => {
  it('parses agent models stdout and keeps auto', () => {
    const rows = parseCursorModels([
      'Available models',
      '',
      'auto - Auto (current, default)',
      'composer-2.5 - Composer 2.5',
      'Tip: use --model <id>',
    ].join('\n'))
    assert.equal(rows[0]?.id, 'auto')
    assert.equal(rows.some(row => row.id === 'composer-2.5' && row.label === 'Composer 2.5'), true)
  })

  it('puts --model before acp and strips auto', () => {
    assert.deepEqual(
      withModelArgs(['C:\\cli\\index.js', 'acp'], 'composer-2.5'),
      ['C:\\cli\\index.js', '--model', 'composer-2.5', 'acp'],
    )
    assert.deepEqual(withModelArgs(['C:\\cli\\index.js', '--model', 'old', 'acp'], 'auto'), ['C:\\cli\\index.js', 'acp'])
  })

  it('splits family / effort / fast and composes a listed id', () => {
    assert.deepEqual(splitCursorModelId('cursor-grok-4.6-high-fast'), {
      family: 'cursor-grok-4.6',
      effort: 'high',
      fast: true,
    })
    const options = [
      { id: 'auto', label: 'Auto' },
      { id: 'cursor-grok-4.6-low', label: 'Cursor Grok 4.6 Low' },
      { id: 'cursor-grok-4.6-high', label: 'Cursor Grok 4.6' },
      { id: 'cursor-grok-4.6-high-fast', label: 'Cursor Grok 4.6 Fast' },
      { id: 'composer-2.5', label: 'Composer 2.5' },
      { id: 'composer-2.5-fast', label: 'Composer 2.5 Fast' },
    ]
    const families = catalogFromOptions(options).families
    assert.equal(families.find(item => item.id === 'cursor-grok-4.6')?.hasFast, true)
    assert.deepEqual(families.find(item => item.id === 'cursor-grok-4.6')?.efforts, ['low', 'high'])
    assert.equal(
      composeCursorModelId({ model: 'cursor-grok-4.6', effort: 'high', fast: true }, options),
      'cursor-grok-4.6-high-fast',
    )
    assert.equal(
      composeCursorModelId({ model: 'composer-2.5', effort: 'high', fast: true }, options),
      'composer-2.5-fast',
    )
    assert.equal(
      composeCursorModelId({ model: 'not-listed', effort: 'high', fast: false }, options),
      'not-listed',
    )
    assert.equal(
      composeCursorModelId({ model: 'cursor-grok-4.6', effort: 'low', fast: true }, options),
      'cursor-grok-4.6[effort=low,fast=true]',
    )
  })
})

describe('settings-schema', () => {
  it('defaults a missing model to auto and splits a legacy full id', () => {
    assert.deepEqual(parseCursorAcpSettings({}), { model: 'auto', effort: 'high', fast: false })
    assert.deepEqual(parseCursorAcpSettings({ model: '  composer-2.5  ', fast: true }), {
      model: 'composer-2.5',
      effort: 'high',
      fast: true,
    })
    assert.deepEqual(parseCursorAcpSettings({ model: 'cursor-grok-4.6-high-fast' }), {
      model: 'cursor-grok-4.6',
      effort: 'high',
      fast: true,
    })
    assert.deepEqual(parseCursorAcpSettings(null), { model: 'auto', effort: 'high', fast: false })
    assert.deepEqual(parseCursorAcpSettings([]), { model: 'auto', effort: 'high', fast: false })
  })
})

describe('cursorAcpStatus', () => {
  it('stays secret-free when the CLI is missing', () => {
    const status = cursorAcpStatus(undefined, {}, 'win32')
    assert.equal(status.found, false)
    assert.equal(status.toolName, 'cursor_agent')
    assert.equal(status.command, undefined)
    assert.equal(status.model, 'auto')
    assert.equal(status.login, 'unknown')
    assert.equal(status.proxy, 'missing')
    assert.match(status.installHint, /cursor.com\/install/)
  })

  it('reports a resolved executable without extra fields', () => {
    const status = cursorAcpStatus({
      command: 'C:\\Users\\test\\AppData\\Local\\cursor-agent\\agent.exe',
      args: ['acp'],
      source: 'localappdata',
    }, { login: 'signed-in', proxy: 'set' })
    assert.equal(status.found, true)
    assert.equal(status.source, 'localappdata')
    assert.equal(status.login, 'signed-in')
    assert.equal(status.proxy, 'set')
    assert.equal(status.clashDirectNode, false)
    assert.equal(/token|password|secret|email|userInfo/i.test(JSON.stringify(status)), false)
  })
})

describe('readiness', () => {
  it('reads login from official status json without keeping account fields', () => {
    assert.equal(parseAgentStatus(JSON.stringify({
      status: 'authenticated',
      isAuthenticated: true,
      userInfo: { email: 'hidden@example.com' },
    }), '', 0), 'signed-in')
    assert.equal(parseAgentStatus(JSON.stringify({
      status: 'unauthenticated',
      isAuthenticated: false,
    }), '', 1), 'signed-out')
    assert.equal(parseAgentStatus('✓ Logged in as hidden@example.com\n', '', 0), 'signed-in')
    assert.equal(parseAgentStatus('', 'Not logged in. Please run agent login.\n', 1), 'signed-out')
    assert.equal(parseAgentStatus('', 'ETIMEDOUT', null), 'unknown')
  })

  it('classifies proxy env without returning values', () => {
    assert.deepEqual(readProxyEnv({}), { kind: 'missing', names: [] })
    assert.deepEqual(readProxyEnv({ HTTPS_PROXY: 'http://127.0.0.1:7890' }), {
      kind: 'partial',
      names: ['HTTPS_PROXY'],
    })
    assert.deepEqual(readProxyEnv({
      HTTPS_PROXY: 'http://127.0.0.1:7890',
      NODE_USE_ENV_PROXY: '1',
    }), { kind: 'set', names: ['HTTPS_PROXY'] })
  })
})

describe('proxyChildEnv', () => {
  it('forwards the five proxy names and fills NODE_USE_ENV_PROXY when a URL is set', () => {
    assert.deepEqual(proxyChildEnv({}), {})
    assert.deepEqual(proxyChildEnv({
      HTTPS_PROXY: 'http://127.0.0.1:7890',
      NO_PROXY: 'localhost',
    }), {
      HTTPS_PROXY: 'http://127.0.0.1:7890',
      NO_PROXY: 'localhost',
      NODE_USE_ENV_PROXY: '1',
    })
    assert.deepEqual(proxyChildEnv({
      HTTPS_PROXY: 'http://127.0.0.1:7890',
      NODE_USE_ENV_PROXY: '1',
    }), {
      HTTPS_PROXY: 'http://127.0.0.1:7890',
      NODE_USE_ENV_PROXY: '1',
    })
  })

  it('passes proxy env into ACP child config and spawn env', () => {
    const parent = {
      PATH: '/bin',
      HTTPS_PROXY: 'http://127.0.0.1:7890',
      NO_PROXY: 'localhost',
    }
    const spawned = spawnAgentEnv(parent)
    assert.equal(spawned.PATH, '/bin')
    assert.equal(spawned.HTTPS_PROXY, 'http://127.0.0.1:7890')
    assert.equal(spawned.NODE_USE_ENV_PROXY, '1')
    const cfg = cursorAcpProviderConfig(
      'C:\\cli\\node.exe',
      ['C:\\cli\\index.js', 'acp'],
      'composer-2.5',
      parent,
    )
    assert.equal(cfg.providerName, 'cursor')
    assert.deepEqual(cfg.args, ['C:\\cli\\index.js', '--model', 'composer-2.5', 'acp'])
    assert.deepEqual(cfg.env, {
      HTTPS_PROXY: 'http://127.0.0.1:7890',
      NO_PROXY: 'localhost',
      NODE_USE_ENV_PROXY: '1',
    })
  })
})

describe('clashDirectsNode', () => {
  it('matches PROCESS-NAME node.exe DIRECT and ignores comments', () => {
    assert.equal(clashDirectsNode('rules:\n  - PROCESS-NAME,node.exe,DIRECT\n'), true)
    assert.equal(clashDirectsNode('  - PROCESS-NAME,node,DIRECT\n'), true)
    assert.equal(clashDirectsNode('# - PROCESS-NAME,node.exe,DIRECT\n  - DOMAIN,cursor.com,PROXY\n'), false)
    assert.equal(clashDirectsNode('  - PROCESS-NAME,chrome.exe,DIRECT\n'), false)
  })

  it('lists well-known clash paths without walking the whole home', () => {
    const paths = clashConfigCandidates({ APPDATA: 'C:\\App', LOCALAPPDATA: 'C:\\Local' }, 'C:\\Home')
    assert.ok(paths.some(path => path.includes('clash') && path.endsWith('config.yaml')))
    assert.ok(paths.every(path => path.startsWith('C:\\')))
  })
})

describe('prompt', () => {
  it('tells the parent when to call cursor_agent and to write a complete prompt', () => {
    assert.match(CURSOR_AGENT_WHEN_TO_USE, /cursor_agent/)
    assert.match(CURSOR_AGENT_WHEN_TO_USE, /complete, self-contained prompt/)
    assert.equal(/万物智汇|X-Mart/iu.test(CURSOR_AGENT_WHEN_TO_USE), false)
  })
})

describe('probe', () => {
  it('builds a read-only print argv and keeps the prompt last', () => {
    const argv = argsForProbeCommand(['C:\\cli\\index.js', 'acp'], 'composer-2.5', 'C:\\tmp\\probe')
    assert.deepEqual(argv, [
      'C:\\cli\\index.js',
      '--print',
      '--mode',
      'ask',
      '--trust',
      '--workspace',
      'C:\\tmp\\probe',
      '--model',
      'composer-2.5',
      PROBE_PROMPT,
    ])
    assert.equal(argsForProbeCommand(['C:\\cli\\index.js', 'acp'], 'auto', 'C:\\tmp\\probe').includes('--model'), false)
  })

  it('classifies print output without keeping CLI text', () => {
    assert.deepEqual(parseProbeOutput('pong\n', '', 0), { kind: 'ok' })
    assert.deepEqual(parseProbeOutput('Pong.', '', 0), { kind: 'ok' })
    assert.deepEqual(parseProbeOutput('', 'Not logged in. Please run agent login.\n', 1), { kind: 'signed-out' })
    assert.deepEqual(parseProbeOutput('nope', '', 1), { kind: 'failed' })
    assert.deepEqual(parseProbeOutput('', '', null), { kind: 'timeout' })
  })
})

describe('locales', () => {
  it('keeps zh and en keys in lockstep', () => {
    assert.deepEqual(Object.keys(zh), Object.keys(en))
  })
})
