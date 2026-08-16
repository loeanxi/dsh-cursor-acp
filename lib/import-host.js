/**
 * Load a first-party harness plugin the running dsh already has.
 * Community install cannot `import '@deepseek-ai/…'` from this package
 * directory — those names resolve from the host, not from a linked plugin.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
 * Walk parents of `start` looking for `relativeFile`.
 * @param start - file or directory.
 * @param relativeFile - path from a repo / install root.
 */
export function findFileWalkingUp(start, relativeFile) {
    let dir = start;
    if (existsSync(start) && /\.[cm]?[jt]sx?$/.test(start))
        dir = dirname(start);
    for (let i = 0; i < 12; i += 1) {
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
 * Import a host plugin by package name, then by a checkout-relative `lib/` file.
 * @param specifier - package name, e.g. `@deepseek-ai/dsh-subagent-acp`.
 * @param relativeLib - `packages/…/lib/index.js` from the harness root.
 */
export async function importHostPlugin(specifier, relativeLib) {
    const here = fileURLToPath(new URL('.', import.meta.url));
    for (const parent of hostSearchRoots(process.argv[1], process.cwd(), here)) {
        try {
            const url = import.meta.resolve(specifier, pathToFileURL(parent).href);
            return await import(url);
        }
        catch {
            // The profile / plugin directory cannot see unpublished workspace names.
        }
    }
    for (const start of hostSearchRoots(process.argv[1], process.cwd(), here)) {
        const file = findFileWalkingUp(start, relativeLib);
        if (file !== undefined)
            return await import(pathToFileURL(file).href);
    }
    throw new Error(`dsh-cursor-acp: cannot resolve ${specifier} (is this dsh build missing that package?)`);
}
