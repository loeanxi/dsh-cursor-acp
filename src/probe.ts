/**
 * Settings-page smoke: one official read-only Cursor CLI print.
 * Secret-free: the public result is only a kind, never stdout/stderr.
 */

import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { argsForModelsCommand } from './list-models.ts'
import { normalizeModel } from './models.ts'
import { spawnAgentEnv } from './proxy-env.ts'
import { probeAgentLogin } from './readiness.ts'

/** Tiny read-only ask used by Settings → Test. */
export const PROBE_PROMPT = 'Reply with exactly pong and nothing else.'

const PROBE_TIMEOUT_MS = 45_000

/** Public probe outcome. No account fields, no CLI text. */
export type ProbeKind = 'ok' | 'missing-cli' | 'signed-out' | 'timeout' | 'failed'

/** Secret-free probe payload. */
export interface ProbeResult {
  readonly kind: ProbeKind
}

/**
 * Argv for `agent --print --mode ask` on the same node/index pair as ACP.
 * @param args - spawn args that end with `acp`.
 * @param model - composed model id (`auto` omits `--model`).
 * @param workspace - empty temp dir so the ask does not use the user project.
 */
export function argsForProbeCommand(
  args: readonly string[],
  model: string,
  workspace: string,
): string[] {
  const prefix = argsForModelsCommand(args)
  const id = normalizeModel(model)
  const modelArgs = id === 'auto' ? [] : ['--model', id]
  return [...prefix, '--print', '--mode', 'ask', '--trust', '--workspace', workspace, ...modelArgs, PROBE_PROMPT]
}

/**
 * Classify a finished print process. Ignores account-shaped text.
 * @param stdout - CLI stdout.
 * @param stderr - CLI stderr.
 * @param exitCode - process exit, or `null` on timeout.
 */
export function parseProbeOutput(stdout: string, stderr: string, exitCode: number | null): ProbeResult {
  if (exitCode === null) return { kind: 'timeout' }
  if (/\bpong\b/iu.test(stdout)) return { kind: 'ok' }
  const text = `${stdout}\n${stderr}`
  if (
    /not logged in/iu.test(text)
    || /unauthenticated/iu.test(text)
    || /please (?:run )?agent login/iu.test(text)
  ) {
    return { kind: 'signed-out' }
  }
  return { kind: 'failed' }
}

/**
 * Run the official read-only print. Uses the user's Cursor quota.
 * @param command - spawnable `node.exe` (or `agent`).
 * @param args - args that would run ACP (`index.js acp`).
 * @param model - composed `--model` id.
 */
export function runCursorProbe(
  command: string,
  args: readonly string[],
  model: string,
): Promise<ProbeResult> {
  const login = probeAgentLogin(command, args)
  if (login === 'signed-out') return Promise.resolve({ kind: 'signed-out' })
  const workspace = mkdtempSync(join(tmpdir(), 'dsh-cursor-acp-probe-'))
  const argv = argsForProbeCommand(args, model, workspace)
  return new Promise((resolve) => {
    const child = spawn(command, argv, {
      env: spawnAgentEnv(),
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    let settled = false
    const finish = (result: ProbeResult): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(result)
    }
    const timer = setTimeout(() => {
      child.kill()
      finish({ kind: 'timeout' })
    }, PROBE_TIMEOUT_MS)
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
      if (stdout.length > 8_000) stdout = stdout.slice(-4_000)
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
      if (stderr.length > 4_000) stderr = stderr.slice(-2_000)
    })
    child.on('error', () => {
      finish({ kind: 'failed' })
    })
    child.on('close', (code) => {
      finish(parseProbeOutput(stdout, stderr, code))
    })
  })
}
