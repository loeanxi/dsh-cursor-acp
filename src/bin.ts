#!/usr/bin/env node
import { detectClashNodeDirect } from './clash-direct.ts'
import { missingHostPluginMessage, resolveHostPluginPath } from './import-host.ts'
import { probeAgentLogin, readProxyEnv } from './readiness.ts'
import { resolveAgent } from './resolve-agent.ts'
import { cursorAcpStatus } from './status.ts'

const ACP = '@deepseek-ai/dsh-subagent-acp'
const TOOL = '@deepseek-ai/dsh-tool-subagent'

function hostPluginError(): string | undefined {
  if (resolveHostPluginPath(ACP, 'packages/subagent/subagent-acp/lib/index.js') === undefined) {
    return missingHostPluginMessage(ACP)
  }
  if (resolveHostPluginPath(TOOL, 'packages/subagent/tool-subagent/lib/index.js') === undefined) {
    return missingHostPluginMessage(TOOL)
  }
  return undefined
}

function doctor(): string {
  const resolved = resolveAgent()
  const proxy = readProxyEnv(process.env)
  const login = resolved === undefined ? 'unknown' : probeAgentLogin(resolved.command, resolved.args)
  const missingHost = hostPluginError()
  const status = cursorAcpStatus(resolved, {
    login,
    proxy: proxy.kind,
    clashDirectNode: detectClashNodeDirect(),
    ...missingHost === undefined ? {} : { hostPluginError: missingHost },
  })
  const clash = status.clashDirectNode
    ? 'clash-node-direct: yes (child may skip the proxy; do not set node.exe to DIRECT)\n'
    : 'clash-node-direct: no\n'
  const host = status.hostPluginError === undefined
    ? 'host-plugin: ok\n'
    : `host-plugin: missing\n${status.hostPluginError}\n`
  if (!status.found) {
    return `dsh-cursor-acp: Cursor CLI not found\nInstall: ${status.installHint}\nlogin: ${status.login}\nproxy: ${status.proxy}\n${clash}${host}`
  }
  return `dsh-cursor-acp: found (${status.source})\ncommand: ${status.command}\ntool: ${status.toolName}\nlogin: ${status.login}\nproxy: ${status.proxy}\n${clash}${host}`
}

const action = process.argv[2] ?? 'doctor'
if (action !== 'doctor' && action !== '--help' && action !== '-h') {
  process.stderr.write(`dsh-cursor-acp: expected doctor; got ${JSON.stringify(action)}\n`)
  process.exit(1)
}
if (action === '--help' || action === '-h') {
  process.stdout.write('Usage: dsh-cursor-acp doctor\n')
  process.exit(0)
}
process.stdout.write(doctor())
