/**
 * Load a first-party harness plugin the running dsh already has.
 * Community install cannot `import '@deepseek-ai/…'` from this package
 * directory — those names resolve from the host, not from a linked plugin.
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const WALK_DEPTH = 12;
/**
 * Candidate directories to walk when looking up a checkout-relative file.
 * @param argv1 - `process.argv[1]` (Electron main or CLI script).
 * @param cwd - `process.cwd()`.
 * @param here - this module's directory.
 */
export function hostSearchRoots(argv1, cwd, here) {
    const roots = [];
    for (const raw of [argv1, cwd, here]) {
        if (raw === undefined || raw === '')
            continue;
        roots.push(raw);
    }
    return roots;
}
/**
 * Profile `package.json` files that may see first-party `@deepseek-ai/*`.
 * @param env - process env.
 * @param home - user home.
 */
export function profilePackageJsons(env, home) {
    const dshHome = env.DSH_HOME !== undefined && env.DSH_HOME.trim() !== ''
        ? env.DSH_HOME.trim()
        : join(home, '.dsh');
    return [
        join(dshHome, 'profiles', 'desktop', 'package.json'),
        join(dshHome, 'profiles', 'web', 'package.json'),
        join(dshHome, 'profiles', 'package.json'),
    ];
}
/**
 * `package.json` files to try with createRequire / import.meta.resolve.
 * Walks parents of each start; does not invent paths that do not exist.
 * @param starts - argv / cwd / plugin dir / profile package.json paths.
 */
export function packageJsonSearchFiles(starts) {
    const files = [];
    const seen = new Set();
    for (const start of starts) {
        if (start === '')
            continue;
        let dir = start;
        if (existsSync(start) && (/\.[cm]?[jt]sx?$/u.test(start) || start.endsWith('.json'))) {
            dir = dirname(start);
        }
        for (let i = 0; i < WALK_DEPTH; i += 1) {
            const pkg = join(dir, 'package.json');
            if (existsSync(pkg) && !seen.has(pkg)) {
                seen.add(pkg);
                files.push(pkg);
            }
            const parent = dirname(dir);
            if (parent === dir)
                break;
            dir = parent;
        }
    }
    return files;
}
/**
 * Resolve a host package from one `package.json` via createRequire, then import.meta.resolve.
 * @param specifier - e.g. `@deepseek-ai/dsh-subagent-acp`.
 * @param fromPackageJson - absolute package.json used as the resolve parent.
 */
export function resolveHostSpecifier(specifier, fromPackageJson) {
    try {
        return createRequire(fromPackageJson).resolve(specifier);
    }
    catch {
        // This package.json cannot see the specifier.
    }
    try {
        const url = import.meta.resolve(specifier, pathToFileURL(fromPackageJson).href);
        return fileURLToPath(new URL(url));
    }
    catch {
        return undefined;
    }
}
/**
 * Walk parents of `start` looking for `relativeFile`.
 * @param start - file or directory.
 * @param relativeFile - path from a repo / install root.
 */
export function findFileWalkingUp(start, relativeFile) {
    let dir = start;
    if (existsSync(start) && /\.[cm]?[jt]sx?$/u.test(start))
        dir = dirname(start);
    for (let i = 0; i < WALK_DEPTH; i += 1) {
        const candidate = join(dir, relativeFile);
        if (existsSync(candidate))
            return candidate;
        const parent = dirname(dir);
        if (parent === dir)
            return undefined;
        dir = parent;
    }
    return undefined;
}
/**
 * User-visible error when the host does not expose a first-party plugin.
 * @param specifier - package name.
 */
export function missingHostPluginMessage(specifier) {
    return (`dsh-cursor-acp: cannot load ${specifier}. cursor_agent is not registered. `
        + 'This dsh build does not expose @deepseek-ai/dsh-subagent-acp and @deepseek-ai/dsh-tool-subagent. '
        + 'Tried createRequire and import.meta.resolve from the running dsh, the profile, and this plugin, '
        + 'then the checkout-relative lib/ path.');
}
/**
 * Import a host plugin by package name, then by a checkout-relative `lib/` file.
 * @param specifier - package name, e.g. `@deepseek-ai/dsh-subagent-acp`.
 * @param relativeLib - `packages/…/lib/index.js` from the harness root.
 */
/**
 * Resolve a host plugin file without importing it.
 * @param specifier - package name.
 * @param relativeLib - checkout-relative fallback.
 */
export function resolveHostPluginPath(specifier, relativeLib) {
    const here = fileURLToPath(new URL('.', import.meta.url));
    const starts = [
        ...hostSearchRoots(process.argv[1], process.cwd(), here),
        ...profilePackageJsons(process.env, homedir()),
    ];
    for (const pkg of packageJsonSearchFiles(starts)) {
        const file = resolveHostSpecifier(specifier, pkg);
        if (file !== undefined)
            return file;
    }
    for (const start of hostSearchRoots(process.argv[1], process.cwd(), here)) {
        const file = findFileWalkingUp(start, relativeLib);
        if (file !== undefined)
            return file;
    }
    return undefined;
}
/**
 * Import a host plugin by package name, then by a checkout-relative `lib/` file.
 * @param specifier - package name, e.g. `@deepseek-ai/dsh-subagent-acp`.
 * @param relativeLib - `packages/…/lib/index.js` from the harness root.
 */
export async function importHostPlugin(specifier, relativeLib) {
    const file = resolveHostPluginPath(specifier, relativeLib);
    if (file !== undefined)
        return await import(pathToFileURL(file).href);
    throw new Error(missingHostPluginMessage(specifier));
}
