/**
 * Run `agent models` once and parse the secret-free listing.
 */

import { spawnSync } from 'node:child_process'
import { parseCursorModels, type CursorModelOption } from './models.ts'
import { spawnAgentEnv } from './proxy-env.ts'

const LIST_TIMEOUT_MS = 8_000

/**
 * Drop a trailing `acp` so we can run `models` on the same node/index pair.
 * @param args - spawn args that end with `acp`.
 */
export function argsForModelsCommand(args: readonly string[]): string[] {
  if (args.length > 0 && args[args.length - 1] === 'acp') return args.slice(0, -1)
  return [...args]
}

/**
 * List models for this Cursor account. Empty on timeout or a non-zero exit.
 * @param command - spawnable `node.exe` (or `agent`).
 * @param args - args that would run ACP (`index.js acp`).
 */
export function listCursorModels(command: string, args: readonly string[]): CursorModelOption[] {
  const result = spawnSync(command, [...argsForModelsCommand(args), 'models'], {
    encoding: 'utf8',
    timeout: LIST_TIMEOUT_MS,
    windowsHide: true,
    env: spawnAgentEnv(),
  })
  if (result.status !== 0) return parseCursorModels('')
  return parseCursorModels(result.stdout ?? '')
}
