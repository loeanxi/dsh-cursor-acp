/**
 * Register Cursor CLI as an ACP subagent when `agent` is on this machine.
 * Named exports only — a default export would drop `inject` (harness postmortem 0001).
 */
import { cursorAcpProviderConfig } from './acp-config.js';
import { importHostPlugin } from './import-host.js';
import { listCursorModels } from './list-models.js';
import { catalogFromOptions, composeCursorModelId } from './models.js';
import { detectClashNodeDirect } from './clash-direct.js';
import { probeAgentLogin, readProxyEnv } from './readiness.js';
import { resolveAgent } from './resolve-agent.js';
import { createCursorAcpSettingsSchema, CURSOR_ACP_SETTINGS_NS, parseCursorAcpSettings } from './settings-schema.js';
import { cursorAcpStatus } from './status.js';
export const name = 'dsh-cursor-acp';
export const inject = ['subagents', 'subprocess', 'tools', 'systemPrompt', 'settings'];
export { resolveAgent } from './resolve-agent.js';
export { cursorAcpStatus } from './status.js';
const STATUS_PATH = '/plugins/dsh-cursor-acp/status';
const ACP_LIB = 'packages/subagent/subagent-acp/lib/index.js';
const TOOL_LIB = 'packages/subagent/tool-subagent/lib/index.js';
function json(res, status, value) {
    res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
    });
    res.end(JSON.stringify(value));
}
function readJsonBody(req, limit = 4096) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > limit) {
                req.destroy();
                reject(new Error('too large'));
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            if (raw.trim() === '') {
                resolve({});
                return;
            }
            try {
                resolve(JSON.parse(raw));
            }
            catch {
                reject(new Error('invalid json'));
            }
        });
        req.on('error', reject);
    });
}
function disposeQuietly(fiber) {
    try {
        fiber?.dispose();
    }
    catch {
        // Already torn down with the parent fiber.
    }
}
function sameChoice(a, b) {
    return a.model === b.model && a.effort === b.effort && a.fast === b.fast;
}
/**
 * Mount the Cursor ACP provider and the model-facing `cursor_agent` tool.
 * @param ctx - host context.
 */
export function apply(ctx) {
    const resolved = resolveAgent();
    let choice = { model: 'auto', effort: 'high', fast: false };
    let models = [{ id: 'auto', label: 'Auto' }];
    if (resolved !== undefined)
        models = listCursorModels(resolved.command, resolved.args);
    let catalog = catalogFromOptions(models);
    let composedModel = composeCursorModelId(choice, models);
    let hostPluginError;
    const settings = ctx.settings;
    const scope = settings.register(CURSOR_ACP_SETTINGS_NS, createCursorAcpSettingsSchema(), {
        base: { model: 'auto', effort: 'high', fast: false },
        applies: 'live',
    });
    choice = scope.get();
    composedModel = composeCursorModelId(choice, models);
    ctx.inject(['webServer'], (webCtx) => {
        const server = webCtx.webServer;
        const statusPayload = () => cursorAcpStatus(resolved, {
            model: choice.model,
            effort: choice.effort,
            fast: choice.fast,
            composedModel,
            models,
            families: catalog.families,
            login: resolved === undefined ? 'unknown' : probeAgentLogin(resolved.command, resolved.args),
            proxy: readProxyEnv(process.env).kind,
            clashDirectNode: detectClashNodeDirect(),
            ...hostPluginError === undefined ? {} : { hostPluginError },
        });
        webCtx.effect(() => server.register({
            kind: 'exact',
            path: STATUS_PATH,
            handler: (req, res) => {
                const method = req.method ?? 'GET';
                if (method === 'GET') {
                    json(res, 200, statusPayload());
                    return;
                }
                if (method !== 'POST') {
                    json(res, 405, { error: 'method-not-allowed' });
                    return;
                }
                void readJsonBody(req).then(async (body) => {
                    const next = parseCursorAcpSettings(body);
                    await scope.update(next);
                    choice = scope.get();
                    composedModel = composeCursorModelId(choice, models);
                    json(res, 200, statusPayload());
                }).catch(() => {
                    json(res, 400, { error: 'invalid-settings' });
                });
            },
        }), 'dsh-cursor-acp: status route');
    });
    if (resolved === undefined) {
        ctx.logger.warn('dsh-cursor-acp: Cursor CLI not found; cursor_agent is not registered. Install from https://cursor.com/docs/cli/installation and run agent login.');
        return;
    }
    void (async () => {
        try {
            const acp = await importHostPlugin('@deepseek-ai/dsh-subagent-acp', ACP_LIB);
            const tool = await importHostPlugin('@deepseek-ai/dsh-tool-subagent', TOOL_LIB);
            let acpFiber;
            let toolFiber;
            const mount = (next) => {
                disposeQuietly(toolFiber);
                disposeQuietly(acpFiber);
                choice = next;
                composedModel = composeCursorModelId(next, models);
                catalog = catalogFromOptions(models);
                acpFiber = ctx.plugin(acp, cursorAcpProviderConfig(resolved.command, resolved.args, composedModel, process.env));
                toolFiber = ctx.plugin(tool, {
                    provider: 'cursor',
                    toolName: 'cursor_agent',
                    backgroundMode: 'one-shot',
                    maxDepth: 'provider-managed',
                });
                ctx.logger.info(`dsh-cursor-acp: cursor_agent model=${composedModel} via ${resolved.source}`);
            };
            mount(scope.get());
            ctx.effect(() => scope.watch((next, prev) => {
                if (sameChoice(next, prev))
                    return;
                mount(next);
            }), 'dsh-cursor-acp: model watch');
        }
        catch (error) {
            hostPluginError = error instanceof Error ? error.message : String(error);
            ctx.logger.error(hostPluginError);
        }
    })();
}
