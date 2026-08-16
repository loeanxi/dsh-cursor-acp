/**
 * Locate the Cursor CLI `agent` executable without reading credentials.
 * Harness subprocess spawn does not use a shell, so Windows must resolve
 * an `.exe`, not `agent.cmd`. The official Win32 installer only ships
 * `agent.cmd` → bundled `node.exe` + `index.js`.
 */
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
const ACP_ARGS = ['acp'];
const VERSION_DIR = /^\d{4}\.\d{1,2}\.\d{1,2}(-\d{2}-\d{2}-\d{2})?-[a-f0-9]+$/;
/**
 * Whether `path` is a usable spawn target (exists; on win32 must be `.exe`).
 * @param path - candidate file.
 */
export function isSpawnableAgent(path) {
    if (!existsSync(path))
        return false;
    if (process.platform === 'win32')
        return path.toLowerCase().endsWith('.exe');
    return true;
}
/**
 * Sort key for official `versions/` folder names (`YYYY.MM.DD-commit`).
 * @param name - directory name.
 */
export function versionSortKey(name) {
    const datePart = name.split('-')[0] ?? '';
    const parts = datePart.split('.');
    if (parts.length !== 3)
        return 0;
    const year = parts[0] ?? '';
    const month = (parts[1] ?? '').padStart(2, '0');
    const day = (parts[2] ?? '').padStart(2, '0');
    const value = Number(`${year}${month}${day}`);
    return Number.isFinite(value) ? value : 0;
}
/**
 * Unwrap an official Cursor CLI install root to `node.exe` + `index.js acp`.
 * @param root - `%LOCALAPPDATA%\cursor-agent` or a version directory.
 */
export function resolveNodeAgentBundle(root) {
    const directNode = join(root, process.platform === 'win32' ? 'node.exe' : 'node');
    const directIndex = join(root, 'index.js');
    if (isSpawnableAgent(directNode) && existsSync(directIndex)) {
        return { command: directNode, args: [directIndex, ...ACP_ARGS] };
    }
    const versionsRoot = join(root, 'versions');
    if (!existsSync(versionsRoot))
        return undefined;
    const dirs = readdirSync(versionsRoot, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && VERSION_DIR.test(entry.name))
        .sort((left, right) => versionSortKey(right.name) - versionSortKey(left.name));
    for (const entry of dirs) {
        const nested = resolveNodeAgentBundle(join(versionsRoot, entry.name));
        if (nested !== undefined)
            return nested;
    }
    return undefined;
}
/**
 * Search PATH for `agent` / `agent.exe`, or unwrap `agent.cmd` to the bundle.
 * @param pathEnv - `process.env.PATH`.
 */
export function searchPathForAgent(pathEnv) {
    if (pathEnv === undefined || pathEnv === '')
        return undefined;
    const names = process.platform === 'win32' ? ['agent.exe'] : ['agent'];
    for (const dir of pathEnv.split(delimiter)) {
        if (dir === '')
            continue;
        for (const name of names) {
            const candidate = join(dir, name);
            if (isSpawnableAgent(candidate))
                return candidate;
        }
    }
    return undefined;
}
/**
 * Search PATH for `agent.cmd` so we can unwrap the official Win32 shim.
 * @param pathEnv - `process.env.PATH`.
 */
export function searchPathForAgentCmd(pathEnv) {
    if (pathEnv === undefined || pathEnv === '')
        return undefined;
    for (const dir of pathEnv.split(delimiter)) {
        if (dir === '')
            continue;
        const cmd = join(dir, 'agent.cmd');
        if (existsSync(cmd))
            return dirname(cmd);
    }
    return undefined;
}
/**
 * Well-known install locations from Cursor's official installer.
 * @param env - process env (tests stub LOCALAPPDATA / HOME).
 */
export function wellKnownAgentPaths(env) {
    const home = env.HOME ?? env.USERPROFILE ?? homedir();
    const local = env.LOCALAPPDATA;
    const found = [];
    if (local !== undefined && local !== '') {
        found.push({ path: join(local, 'cursor-agent', 'agent.exe'), source: 'localappdata' });
        found.push({ path: join(local, 'cursor-agent', 'agent'), source: 'localappdata' });
    }
    found.push({ path: join(home, '.local', 'bin', 'agent'), source: 'home-local' });
    return found;
}
/**
 * Resolve `agent` for ACP spawn, or `undefined` when missing.
 * @param env - process env.
 */
export function resolveAgent(env = process.env) {
    const fromPath = searchPathForAgent(env.PATH ?? env.Path);
    if (fromPath !== undefined) {
        return { command: fromPath, args: ACP_ARGS, source: 'path' };
    }
    const cmdRoot = searchPathForAgentCmd(env.PATH ?? env.Path);
    if (cmdRoot !== undefined) {
        const bundle = resolveNodeAgentBundle(cmdRoot);
        if (bundle !== undefined)
            return { ...bundle, source: 'path' };
    }
    const local = env.LOCALAPPDATA;
    if (local !== undefined && local !== '') {
        const bundle = resolveNodeAgentBundle(join(local, 'cursor-agent'));
        if (bundle !== undefined)
            return { ...bundle, source: 'localappdata' };
    }
    for (const candidate of wellKnownAgentPaths(env)) {
        if (isSpawnableAgent(candidate.path)) {
            return { command: candidate.path, args: ACP_ARGS, source: candidate.source };
        }
    }
    return undefined;
}
