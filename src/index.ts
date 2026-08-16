/**
 * Register Cursor CLI as an ACP subagent when `agent` is on this machine.
 * Named exports only — a default export would drop `inject` (harness postmortem 0001).
 */

import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { importHostPlugin } from './import-host.ts'
import { listCursorModels } from './list-models.ts'
import { catalogFromOptions, composeCursorModelId, withModelArgs, type CursorModelOption } from './models.ts'
import { resolveAgent } from './resolve-agent.ts'
import { createCursorAcpSettingsSchema, CURSOR_ACP_SETTINGS_NS, type CursorAcpSettings } from './settings-schema.ts'
import { cursorAcpStatus } from './status.ts'

export const name = 'dsh-cursor-acp'
export const inject = ['subagents', 'subprocess', 'tools', 'systemPrompt', 'settings']

export { resolveAgent } from './resolve-agent.ts'
export { cursorAcpStatus } from './status.ts'

const STATUS_PATH = '/plugins/dsh-cursor-acp/status'
const ACP_LIB = 'packages/subagent/subagent-acp/lib/index.js'
const TOOL_LIB = 'packages/subagent/tool-subagent/lib/index.js'

interface DisposableFiber {
  dispose: () => void
}

interface SettingsHandle {
  register: (ns: string, schema: unknown, options?: { base?: object; applies?: 'live' | 'restart' }) => {
    get: () => CursorAcpSettings
    watch: (cb: (next: CursorAcpSettings, prev: CursorAcpSettings) => void) => () => void
  }
}

function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(value))
}

function disposeQuietly(fiber: DisposableFiber | undefined): void {
  try {
    fiber?.dispose()
  } catch {
    // Already torn down with the parent fiber.
  }
}

function sameChoice(a: CursorAcpSettings, b: CursorAcpSettings): boolean {
  return a.model === b.model && a.effort === b.effort && a.fast === b.fast
}

/**
 * Mount the Cursor ACP provider and the model-facing `cursor_agent` tool.
 * @param ctx - host context.
 */
export function apply(ctx: Context): void {
  const resolved = resolveAgent()
  let choice: CursorAcpSettings = { model: 'auto', effort: 'high', fast: false }
  let models: readonly CursorModelOption[] = [{ id: 'auto', label: 'Auto' }]
  if (resolved !== undefined) models = listCursorModels(resolved.command, resolved.args)
  let catalog = catalogFromOptions(models)
  let composedModel = composeCursorModelId(choice, models)

  const settings = (ctx as Context & { settings: SettingsHandle }).settings
  const scope = settings.register(CURSOR_ACP_SETTINGS_NS, createCursorAcpSettingsSchema(), {
    base: { model: 'auto', effort: 'high', fast: false },
    applies: 'live',
  })
  choice = scope.get()
  composedModel = composeCursorModelId(choice, models)

  ctx.inject(['webServer'], (webCtx: Context) => {
    const server = (webCtx as Context & {
      webServer: { register: (route: {
        kind: 'exact'
        path: string
        handler: (req: IncomingMessage, res: ServerResponse) => void
      }) => () => void }
    }).webServer
    webCtx.effect(() => server.register({
      kind: 'exact',
      path: STATUS_PATH,
      handler: (_req: IncomingMessage, res: ServerResponse) => {
        json(res, 200, cursorAcpStatus(resolved, {
          model: choice.model,
          effort: choice.effort,
          fast: choice.fast,
          composedModel,
          models,
          families: catalog.families,
        }))
      },
    }), 'dsh-cursor-acp: status route')
  })

  if (resolved === undefined) {
    ctx.logger.warn('dsh-cursor-acp: Cursor CLI not found; cursor_agent is not registered. Install from https://cursor.com/docs/cli/installation and run agent login.')
    return
  }

  void (async () => {
    try {
      const acp = await importHostPlugin('@deepseek-ai/dsh-subagent-acp', ACP_LIB)
      const tool = await importHostPlugin('@deepseek-ai/dsh-tool-subagent', TOOL_LIB)
      let acpFiber: DisposableFiber | undefined
      let toolFiber: DisposableFiber | undefined

      const mount = (next: CursorAcpSettings): void => {
        disposeQuietly(toolFiber)
        disposeQuietly(acpFiber)
        choice = next
        composedModel = composeCursorModelId(next, models)
        catalog = catalogFromOptions(models)
        acpFiber = ctx.plugin(acp, {
          providerName: 'cursor',
          command: resolved.command,
          args: withModelArgs(resolved.args, composedModel),
          permission: 'allow',
        }) as DisposableFiber
        toolFiber = ctx.plugin(tool, {
          provider: 'cursor',
          toolName: 'cursor_agent',
          backgroundMode: 'one-shot',
          maxDepth: 'provider-managed',
        }) as DisposableFiber
        ctx.logger.info(`dsh-cursor-acp: cursor_agent model=${composedModel} via ${resolved.source}`)
      }

      mount(scope.get())
      ctx.effect(() => scope.watch((next, prev) => {
        if (sameChoice(next, prev)) return
        mount(next)
      }), 'dsh-cursor-acp: model watch')
    } catch (error: unknown) {
      ctx.logger.error(error)
    }
  })()
}
