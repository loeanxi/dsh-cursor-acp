/**
 * Best-effort: Clash / mihomo configs that send node.exe DIRECT.
 * Reads only well-known yaml paths. Never returns file text or URLs.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const NODE_DIRECT = /PROCESS-NAME(?:-REGEX)?\s*,\s*['"]?node(?:\.exe)?['"]?\s*,\s*DIRECT\b/iu
const MAX_PROFILE_FILES = 20
const MAX_FILE_BYTES = 512_000

/**
 * Whether a Clash-style rule line sends `node` / `node.exe` DIRECT.
 * @param text - yaml or snippet. Secrets in other lines are ignored.
 */
export function clashDirectsNode(text: string): boolean {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    if (NODE_DIRECT.test(trimmed)) return true
  }
  return false
}

/**
 * Well-known Clash / mihomo / Verge config locations. No recursive home walk.
 * @param env - process env (APPDATA / LOCALAPPDATA / HOME).
 * @param home - user home.
 */
export function clashConfigCandidates(env: NodeJS.ProcessEnv, home: string): string[] {
  const appdata = env.APPDATA ?? join(home, 'AppData', 'Roaming')
  const local = env.LOCALAPPDATA ?? join(home, 'AppData', 'Local')
  const roots = [
    join(home, '.config', 'clash'),
    join(home, '.config', 'mihomo'),
    join(home, '.config', 'clash-verge'),
    join(appdata, 'clash'),
    join(appdata, 'mihomo'),
    join(appdata, 'clash-verge'),
    join(appdata, 'io.github.clash-verge-rev.clash-verge-rev'),
    join(local, 'clash'),
  ]
  const files: string[] = []
  for (const root of roots) {
    files.push(join(root, 'config.yaml'), join(root, 'config.yml'))
    files.push(...yamlFilesIn(join(root, 'profiles')))
  }
  return files
}

/**
 * True when a well-known Clash config sends node.exe DIRECT.
 * @param env - process env.
 * @param home - user home.
 */
export function detectClashNodeDirect(env: NodeJS.ProcessEnv = process.env, home = homedir()): boolean {
  for (const path of clashConfigCandidates(env, home)) {
    if (!existsSync(path)) continue
    let text: string
    try {
      text = readFileSync(path, { encoding: 'utf8' })
    } catch {
      continue
    }
    if (text.length > MAX_FILE_BYTES) text = text.slice(0, MAX_FILE_BYTES)
    if (clashDirectsNode(text)) return true
  }
  return false
}

function yamlFilesIn(dir: string): string[] {
  if (!existsSync(dir)) return []
  try {
    return readdirSync(dir)
      .filter(name => /\.ya?ml$/iu.test(name))
      .slice(0, MAX_PROFILE_FILES)
      .map(name => join(dir, name))
  } catch {
    return []
  }
}
