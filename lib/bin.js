#!/usr/bin/env node
import { resolveAgent } from './resolve-agent.js';
import { cursorAcpStatus } from './status.js';
function doctor() {
    const status = cursorAcpStatus(resolveAgent());
    if (!status.found) {
        return `dsh-cursor-acp: Cursor CLI not found\nInstall: ${status.installHint}\n`;
    }
    return `dsh-cursor-acp: found (${status.source})\ncommand: ${status.command}\ntool: ${status.toolName}\n`;
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
