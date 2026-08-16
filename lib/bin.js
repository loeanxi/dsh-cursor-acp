#!/usr/bin/env node
import { probeAgentLogin, readProxyEnv } from './readiness.js';
import { resolveAgent } from './resolve-agent.js';
import { cursorAcpStatus } from './status.js';
function doctor() {
    const resolved = resolveAgent();
    const proxy = readProxyEnv(process.env);
    const login = resolved === undefined ? 'unknown' : probeAgentLogin(resolved.command, resolved.args);
    const status = cursorAcpStatus(resolved, { login, proxy: proxy.kind });
    if (!status.found) {
        return `dsh-cursor-acp: Cursor CLI not found\nInstall: ${status.installHint}\nlogin: ${status.login}\nproxy: ${status.proxy}\n`;
    }
    return `dsh-cursor-acp: found (${status.source})\ncommand: ${status.command}\ntool: ${status.toolName}\nlogin: ${status.login}\nproxy: ${status.proxy}\n`;
}
const action = process.argv[2] ?? 'doctor';
if (action !== 'doctor' && action !== '--help' && action !== '-h') {
    process.stderr.write(`dsh-cursor-acp: expected doctor; got ${JSON.stringify(action)}\n`);
    process.exit(1);
}
if (action === '--help' || action === '-h') {
    process.stdout.write('Usage: dsh-cursor-acp doctor\n');
    process.exit(0);
}
process.stdout.write(doctor());
