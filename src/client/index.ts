import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { CursorAcpSection, type CursorAcpSettingsValue, type CursorAcpStatusView } from './CursorAcpSection.tsx'
import { en, zh, type CursorAcpKey } from './locales.ts'

export const name = 'dsh-cursor-acp-client'
export const inject = ['slots', 'locale']

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'settings.cursor-acp': CursorAcpKey
  }
}

const NS = 'settings.cursor-acp'
const STATUS_PATH = '/plugins/dsh-cursor-acp/status'
const PROBE_PATH = '/plugins/dsh-cursor-acp/probe'

async function loadStatus(): Promise<CursorAcpStatusView> {
  const response = await fetch(STATUS_PATH, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`status ${String(response.status)}`)
  return await response.json() as CursorAcpStatusView
}

async function saveSettings(next: Required<CursorAcpSettingsValue>): Promise<CursorAcpStatusView> {
  const response = await fetch(STATUS_PATH, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(next),
  })
  if (!response.ok) throw new Error(`save ${String(response.status)}`)
  return await response.json() as CursorAcpStatusView
}

async function runProbe(): Promise<{ kind: 'ok' | 'missing-cli' | 'signed-out' | 'timeout' | 'failed' }> {
  const response = await fetch(PROBE_PATH, {
    method: 'POST',
    headers: { accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`probe ${String(response.status)}`)
  return await response.json() as { kind: 'ok' | 'missing-cli' | 'signed-out' | 'timeout' | 'failed' }
}

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-cursor-acp: dictionaries')
  const t = ctx.locale.bind(NS)
  // One card inside the Plugins → configurable settings tab ("插件配置").
  // The tab dispatches cards by settings namespace; `cursor-acp` is registered
  // host-side, so the Host's describe mirror serves it and this card appears.
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register(
    {
      name: 'settings.plugin.item',
      key: 'cursor-acp',
      locale: NS,
      inject: () => ({
        t: (key: CursorAcpKey) => t(key),
        loadStatus,
        saveSettings,
        runProbe,
      }),
    },
    CursorAcpSection,
  ))
}
