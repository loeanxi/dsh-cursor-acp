/**
 * Secret-free login / proxy readiness. Uses official `agent status` only.
 * Never reads Cursor credential files, never forwards email or tokens.
 */
import { spawnSync } from 'node:child_process';
import { argsForModelsCommand } from './list-models.js';
const STATUS_TIMEOUT_MS = 8_000;
const PROXY_NAMES = ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy'];
/**
 * Names of proxy variables that are set. Values are dropped on purpose.
 * @param env - process env.
 */
export function readProxyEnv(env) {
    const names = PROXY_NAMES.filter((name) => {
        const value = env[name];
        return value !== undefined && value.trim() !== '';
    });
    const nodeFlag = env.NODE_USE_ENV_PROXY === '1';
    if (names.length === 0)
        return { kind: 'missing', names: [] };
    if (!nodeFlag)
        return { kind: 'partial', names };
    return { kind: 'set', names };
}
/**
 * Parse official `agent status` output. Ignores account fields.
 * @param stdout - CLI stdout.
 * @param stderr - CLI stderr.
 * @param exitCode - process exit, or `null` on timeout.
 */
export function parseAgentStatus(stdout, stderr, exitCode) {
    const fromJson = parseStatusJson(stdout);
    if (fromJson !== undefined)
        return fromJson;
    const text = `${stdout}\n${stderr}`;
    if (/logged in as/iu.test(text) || /✓\s*logged in/iu.test(text))
        return 'signed-in';
    if (/not logged in/iu.test(text)
        || /please (?:run )?agent login/iu.test(text)
        || /unauthenticated/iu.test(text)) {
        return 'signed-out';
    }
    if (exitCode === 0 && stdout.trim() !== '')
        return 'unknown';
    return 'unknown';
}
/**
 * Run `agent status --format json` and return a secret-free login state.
 * @param command - spawnable `node.exe` (or `agent`).
 * @param args - args that would run ACP (`index.js acp`).
 */
export function probeAgentLogin(command, args) {
    const result = spawnSync(command, [...argsForModelsCommand(args), 'status', '--format', 'json'], {
        encoding: 'utf8',
        timeout: STATUS_TIMEOUT_MS,
        windowsHide: true,
    });
    return parseAgentStatus(result.stdout ?? '', result.stderr ?? '', result.status);
}
function parseStatusJson(stdout) {
    const trimmed = stdout.trim();
    if (trimmed === '' || !trimmed.startsWith('{'))
        return undefined;
    try {
        const raw = JSON.parse(trimmed);
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
            return undefined;
        const rec = raw;
        if (rec.isAuthenticated === true || rec.status === 'authenticated')
            return 'signed-in';
        if (rec.isAuthenticated === false)
            return 'signed-out';
        if (typeof rec.status === 'string' && /unauth|logged.?out|not.?auth/iu.test(rec.status)) {
            return 'signed-out';
        }
        return undefined;
    }
    catch {
        return undefined;
    }
}
