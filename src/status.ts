import type { CursorModelChoice, CursorModelFamily, CursorModelOption } from './models.ts'
import type { LoginState, ProxyKind } from './readiness.ts'
import type { ResolvedAgent } from './resolve-agent.ts'

/** Public, secret-free status for the settings page and doctor. */
export interface CursorAcpStatus {
  readonly found: boolean
  readonly command?: string
  readonly source?: ResolvedAgent['source']
  readonly toolName: 'cursor_agent'
  readonly installHint: string
  readonly login: LoginState
  readonly proxy: ProxyKind
  readonly model: string
  readonly composedModel: string
  readonly effort: CursorModelChoice['effort']
  readonly fast: boolean
  readonly models: readonly CursorModelOption[]
  readonly families: readonly CursorModelFamily[]
}

/**
 * Build the public status payload.
 * @param resolved - locate result.
 * @param extras - current picker state and account listing.
 * @param platform - `process.platform` (tests stub).
 */
export function cursorAcpStatus(
  resolved: ResolvedAgent | undefined,
  extras: {
    model?: string
    effort?: CursorModelChoice['effort']
    fast?: boolean
    composedModel?: string
    models?: readonly CursorModelOption[]
    families?: readonly CursorModelFamily[]
    login?: LoginState
    proxy?: ProxyKind
  } = {},
  platform = process.platform,
): CursorAcpStatus {
  const installHint = platform === 'win32'
    ? "irm 'https://cursor.com/install?win32=true' | iex   then: agent login"
    : 'curl https://cursor.com/install -fsS | bash   then: agent login'
  const model = extras.model ?? 'auto'
  const effort = extras.effort ?? 'high'
  const fast = extras.fast === true
  const models = extras.models ?? [{ id: 'auto', label: 'Auto' }]
  const families = extras.families ?? [{ id: 'auto', label: 'Auto', efforts: [], hasFast: false }]
  const composedModel = extras.composedModel ?? model
  const login = extras.login ?? 'unknown'
  const proxy = extras.proxy ?? 'missing'
  if (resolved === undefined) {
    return {
      found: false, toolName: 'cursor_agent', installHint, login, proxy,
      model, effort, fast, composedModel, models, families,
    }
  }
  return {
    found: true,
    command: resolved.command,
    source: resolved.source,
    toolName: 'cursor_agent',
    installHint,
    login,
    proxy,
    model,
    effort,
    fast,
    composedModel,
    models,
    families,
  }
}
