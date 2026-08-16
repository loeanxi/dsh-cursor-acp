import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { CursorAcpSection, type CursorAcpStatusView } from './CursorAcpSection.tsx'
import { en, zh, type CursorAcpKey } from './locales.ts'

export const name = 'dsh-cursor-acp-client'
export const inject = ['slots', 'locale', 'settingsScope', 'connection', 'remote']

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'settings.cursor-acp': CursorAcpKey
  }
}

const NS = 'settings.cursor-acp'
const SETTINGS_NS = 'cursor-acp'
const STATUS_PATH = '/plugins/dsh-cursor-acp/status'

async function loadStatus(): Promise<CursorAcpStatusView> {
  const response = await fetch(STATUS_PATH, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`status ${String(response.status)}`)
  return await response.json() as CursorAcpStatusView
}

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-cursor-acp: dictionaries')
  const t = ctx.locale.bind(NS)
  const settingsScope = ctx.settingsScope.bind<{ model: string; effort: string; fast: boolean }>({
    namespace: SETTINGS_NS,
    decode: (section) => {
      if (typeof section !== 'object' || section === null || Array.isArray(section)) return undefined
      const rec = section as { model?: unknown; effort?: unknown; fast?: unknown }
      if (typeof rec.model !== 'string') return undefined
      return {
        model: rec.model,
        effort: typeof rec.effort === 'string' ? rec.effort : 'high',
        fast: rec.fast === true,
      }
    },
  })
  ctx.slots.inject('settings.section', () => ctx.slots.register(
    {
      name: 'settings.section',
      id: 'cursor-acp',
      order: 26,
      label: () => t('nav'),
      locale: NS,
      inject: () => ({
        t: (key: CursorAcpKey) => t(key),
        loadStatus,
        settingsScope,
      }),
    },
    CursorAcpSection,
  ))
}
