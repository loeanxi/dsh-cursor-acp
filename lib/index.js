/**
 * Register Cursor CLI as an ACP subagent when `agent` is on this machine.
 * Named exports only — a default export would drop `inject` (harness postmortem 0001).
 */
import { importHostPlugin } from './import-host.js';
import { listCursorModels } from './list-models.js';
import { catalogFromOptions, composeCursorModelId, withModelArgs } from './models.js';
import { resolveAgent } from './resolve-agent.js';
import { createCursorAcpSettingsSchema, CURSOR_ACP_SETTINGS_NS } from './settings-schema.js';
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
    const settings = ctx.settings;
    const scope = settings.register(CURSOR_ACP_SETTINGS_NS, createCursorAcpSettingsSchema(), {
        base: { model: 'auto', effort: 'high', fast: false },
        applies: 'live',
    });
    choice = scope.get();
    composedModel = composeCursorModelId(choice, models);
    ctx.inject(['webServer'], (webCtx) => {
        const server = webCtx.webServer;
        webCtx.effect(() => server.register({
            kind: 'exact',
            path: STATUS_PATH,
            handler: (_req, res) => {
                json(res, 200, cursorAcpStatus(resolved, {
                    model: choice.model,
                    effort: choice.effort,
                    fast: choice.fast,
                    composedModel,
                    models,
                    families: catalog.families,
                }));
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
                acpFiber = ctx.plugin(acp, {
                    providerName: 'cursor',
                    command: resolved.command,
                    args: withModelArgs(resolved.args, composedModel),
                    permission: 'allow',
                });
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
            ctx.logger.error(error);
        }
    })();
}
