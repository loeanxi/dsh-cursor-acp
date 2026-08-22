import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { CursorAcpKey } from './locales.ts'

export interface CursorModelOption {
  readonly id: string
  readonly label: string
}

export interface CursorModelFamily {
  readonly id: string
  readonly label: string
  readonly efforts: readonly string[]
  readonly hasFast: boolean
}

export interface CursorAcpStatusView {
  readonly found: boolean
  readonly command?: string
  readonly installHint: string
  readonly login?: 'signed-in' | 'signed-out' | 'unknown'
  readonly proxy?: 'missing' | 'partial' | 'set'
  readonly clashDirectNode?: boolean
  readonly hostPluginError?: string
  readonly model: string
  readonly effort: string
  readonly fast: boolean
  readonly composedModel: string
  readonly models: readonly CursorModelOption[]
  readonly families: readonly CursorModelFamily[]
}

export interface CursorAcpSettingsValue {
  readonly model?: string
  readonly effort?: string
  readonly fast?: boolean
}

export type CursorAcpProbeKind = 'ok' | 'missing-cli' | 'signed-out' | 'timeout' | 'failed'

export interface CursorAcpSectionProps {
  readonly t: (key: CursorAcpKey) => string
  readonly loadStatus: () => Promise<CursorAcpStatusView>
  readonly saveSettings: (next: Required<CursorAcpSettingsValue>) => Promise<CursorAcpStatusView>
  readonly runProbe: () => Promise<{ kind: CursorAcpProbeKind }>
}

const EFFORT_KEYS = {
  low: 'effortLow',
  medium: 'effortMedium',
  high: 'effortHigh',
  xhigh: 'effortXhigh',
  max: 'effortMax',
} as const

type Tone = 'ok' | 'warn' | 'error' | 'neutral'
type Overall = 'ok' | 'warn' | 'error'

const toneColor: Record<Tone, string> = {
  ok: 'var(--dsw-alias-state-success-primary)',
  warn: 'var(--dsw-alias-state-warn-primary)',
  error: 'var(--dsw-alias-state-error-primary)',
  neutral: 'var(--dsw-alias-border-l2)',
}

const toneText: Record<'ok' | 'warn' | 'error', string> = {
  ok: 'var(--dsw-alias-state-success-primary)',
  warn: 'var(--dsw-alias-state-warn-label)',
  error: 'var(--dsw-alias-state-error-primary)',
}

function choiceFrom(status: CursorAcpStatusView | 'loading' | 'error'): Required<CursorAcpSettingsValue> {
  if (status !== 'loading' && status !== 'error') {
    return {
      model: status.model,
      effort: status.effort,
      fast: status.fast,
    }
  }
  return { model: 'auto', effort: 'high', fast: false }
}

function sameChoice(a: Required<CursorAcpSettingsValue>, b: Required<CursorAcpSettingsValue>): boolean {
  return a.model === b.model && a.effort === b.effort && a.fast === b.fast
}

function previewComposed(
  choice: Required<CursorAcpSettingsValue>,
  status: CursorAcpStatusView,
): string {
  if (choice.model === 'auto') return 'auto'
  const family = status.families.find(item => item.id === choice.model)
  if (family === undefined) return choice.model
  const effort = family.efforts.includes(choice.effort)
    ? choice.effort
    : family.efforts.includes('high')
      ? 'high'
      : (family.efforts[0] ?? choice.effort)
  const fast = family.hasFast && choice.fast
  const listed = family.efforts.length === 0
    ? (fast ? `${choice.model}-fast` : choice.model)
    : `${choice.model}-${effort}${fast ? '-fast' : ''}`
  if (status.models.some(item => item.id === listed)) return listed
  if (family.efforts.length > 0) {
    return `${choice.model}[effort=${effort},fast=${fast ? 'true' : 'false'}]`
  }
  return listed
}

function overallOf(status: CursorAcpStatusView): Overall {
  if (!status.found || status.hostPluginError !== undefined) return 'error'
  if (status.login === 'signed-in' && status.proxy === 'set' && status.clashDirectNode !== true) return 'ok'
  return 'warn'
}

const card: CSSProperties = {
  marginTop: 16,
  border: '1px solid var(--dsw-alias-border-l2)',
  borderRadius: 10,
  background: 'var(--dsw-alias-bg-layer-1)',
  overflow: 'hidden',
}

const heading: CSSProperties = {
  padding: '10px 12px 4px',
  fontSize: 11,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
  color: 'var(--dsw-alias-label-tertiary)',
}

const row: CSSProperties = {
  padding: '8px 12px 12px',
}

const divider: CSSProperties = {
  height: 1,
  background: 'var(--dsw-alias-border-l2)',
}

const helpText: CSSProperties = {
  margin: '0 0 8px',
  fontSize: 13,
  lineHeight: 1.6,
  color: 'var(--dsw-alias-label-secondary)',
}

const codeStyle: CSSProperties = {
  fontSize: 12,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  background: 'color-mix(in srgb, var(--dsw-alias-label-secondary) 10%, transparent)',
  padding: '1px 5px',
  borderRadius: 5,
  wordBreak: 'break-all',
}

const buttonBase: CSSProperties = {
  padding: '6px 14px',
  borderRadius: 8,
  fontSize: 13,
  border: '1px solid transparent',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const pendingBadge: CSSProperties = {
  fontSize: 11,
  padding: '2px 8px',
  borderRadius: 999,
  color: 'var(--dsw-alias-state-warn-label)',
  background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary) 14%, transparent)',
  whiteSpace: 'nowrap',
}

const liveBadge: CSSProperties = {
  fontSize: 11,
  padding: '2px 8px',
  borderRadius: 999,
  color: 'var(--dsw-alias-state-success-primary)',
  background: 'color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent)',
  whiteSpace: 'nowrap',
}

function StatusDot({ tone }: { tone: Tone }) {
  return (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: toneColor[tone],
        flexShrink: 0,
        marginTop: 6,
      }}
    />
  )
}

function DetailRow({ label, tone, children }: { label: string; tone: Tone; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '5px 0' }}>
      <StatusDot tone={tone} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--dsw-alias-label-tertiary)' }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--dsw-alias-label-primary)', marginTop: 1, wordBreak: 'break-word' }}>{children}</div>
      </div>
    </div>
  )
}

const probeTone: Record<CursorAcpProbeKind, 'ok' | 'warn' | 'error'> = {
  ok: 'ok',
  failed: 'error',
  'missing-cli': 'error',
  'signed-out': 'error',
  timeout: 'warn',
}

const probeResultKey: Record<CursorAcpProbeKind, CursorAcpKey> = {
  ok: 'probeOk',
  failed: 'probeFail',
  'missing-cli': 'probeMissing',
  'signed-out': 'probeSignedOut',
  timeout: 'probeTimeout',
}

export function CursorAcpSection(props: CursorAcpSectionProps) {
  const { t, loadStatus, saveSettings, runProbe } = props
  const [status, setStatus] = useState<CursorAcpStatusView | 'loading' | 'error'>('loading')
  const [custom, setCustom] = useState('')
  const [draft, setDraft] = useState<Required<CursorAcpSettingsValue> | null>(null)
  const [saveError, setSaveError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [appliedFlash, setAppliedFlash] = useState(false)
  const [probe, setProbe] = useState<CursorAcpProbeKind | 'idle' | 'running'>('idle')
  const [open, setOpen] = useState(false)
  useEffect(() => {
    let cancelled = false
    void loadStatus().then(
      (next) => { if (!cancelled) setStatus(next) },
      () => { if (!cancelled) setStatus('error') },
    )
    return () => { cancelled = true }
  }, [loadStatus])

  const statusView = status !== 'loading' && status !== 'error' ? status : null
  const writable = statusView !== null && !saving
  const saved = choiceFrom(status)
  const choice = draft ?? saved
  const dirty = draft !== null && !sameChoice(draft, saved)
  const families = statusView !== null ? statusView.families : [{ id: 'auto', label: 'Auto', efforts: [], hasFast: false }]
  const family = families.find(item => item.id === choice.model) ?? families[0]
  const efforts = family?.efforts ?? []
  const showEffort = choice.model !== 'auto' && efforts.length > 0
  const showFast = choice.model !== 'auto' && family?.hasFast === true
  const composed = statusView !== null ? previewComposed(choice, statusView) : choice.model
  const isWindows = typeof navigator !== 'undefined' && /Win/i.test(navigator.platform)

  const setField = (field: keyof Required<CursorAcpSettingsValue>, value: string | boolean): void => {
    setDraft({ ...choice, [field]: value })
  }

  const applyChoice = (next: Required<CursorAcpSettingsValue>): void => {
    void (async () => {
      setSaving(true)
      setSaveError(false)
      try {
        const savedNext = await saveSettings(next)
        setStatus(savedNext)
        setDraft(null)
        setAppliedFlash(true)
        window.setTimeout(() => setAppliedFlash(false), 3000)
      } catch {
        setSaveError(true)
      } finally {
        setSaving(false)
      }
    })()
  }

  const over = statusView !== null ? overallOf(statusView) : ('warn' as Overall)
  const conclusion = statusView !== null
    ? !statusView.found
      ? t('stateMissingCli')
      : statusView.hostPluginError !== undefined
        ? t('stateBrokenHost')
        : over === 'ok'
          ? t('stateReady')
          : t('stateWarn')
    : ''
  const loginTone: Tone = statusView?.login === 'signed-in' ? 'ok' : statusView?.login === 'signed-out' ? 'error' : 'warn'
  const loginText = statusView?.login === 'signed-in' ? t('logOk') : statusView?.login === 'signed-out' ? t('logOut') : t('logUnknown')
  const proxyTone: Tone = statusView?.proxy === 'set' ? 'ok' : statusView?.proxy === 'partial' ? 'warn' : 'error'
  const proxyText = statusView?.proxy === 'set' ? t('proxySet') : statusView?.proxy === 'partial' ? t('proxyPartial') : t('proxyMissing')

  // One card inside the Plugins → configurable settings tab, collapsible like
  // the other plugin cards around it. Staged edits outlive collapsing.
  return (
    <li style={{
      listStyle: 'none',
      border: '1px solid var(--dsw-alias-border-l2)',
      borderRadius: 12,
      background: open ? 'var(--dsw-alias-bg-layer-2)' : 'var(--dsw-alias-bg-layer-3)',
      transition: 'border-color .16s, background .16s',
    }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => { setOpen(!open) }}
        style={{
          width: '100%',
          appearance: 'none',
          border: 0,
          background: 'none',
          font: 'inherit',
          color: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          borderRadius: 12,
        }}
      >
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: 'var(--dsw-alias-label-primary)' }}>{t('nav')}</span>
          <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--dsw-alias-label-tertiary)' }}>{t('intro')}</span>
        </span>
        {dirty ? (
          <span style={{
            flex: 'none',
            borderRadius: 999,
            padding: '1px 8px',
            fontSize: 11,
            lineHeight: '17px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            background: 'var(--dsw-alias-bg-module-platform)',
            color: 'var(--dsw-alias-label-secondary)',
          }}>
            {t('pendingBadge')}
          </span>
        ) : null}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          aria-hidden
          style={{
            flex: 'none',
            color: 'var(--dsw-alias-label-tertiary)',
            transition: 'transform .16s',
            transform: open ? 'rotate(180deg)' : undefined,
          }}
        >
          <path d="M3.5 5.5 7 9l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div style={{ borderTop: '1px solid var(--dsw-alias-border-l2)', margin: '0 16px', paddingBottom: 8 }}>
      {statusView === null ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--dsw-alias-label-secondary)' }}>
          {status === 'error' ? <span style={{ color: 'var(--dsw-alias-state-error-primary)' }}>{t('failed')}</span> : t('loading')}
        </p>
      ) : (
        <>
          {/* 1 — 状态横幅 */}
          <div
            style={{
              marginTop: 0,
              border: '1px solid var(--dsw-alias-border-l2)',
              borderLeft: `3px solid ${toneColor[over]}`,
              borderRadius: 10,
              background: `color-mix(in srgb, ${toneColor[over]} 7%, transparent)`,
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px' }}>
              <StatusDot tone={over} />
              <strong style={{ fontSize: 14, lineHeight: 1.55 }}>{conclusion}</strong>
            </div>
            <div style={{ padding: '0 14px 10px', borderTop: '1px solid var(--dsw-alias-border-l2)' }}>
              {statusView.found ? (
                <>
                  <DetailRow label={t('detailExec')} tone="neutral">
                    {statusView.command !== undefined ? <code style={codeStyle}>{statusView.command}</code> : '—'}
                  </DetailRow>
                  <DetailRow label={t('detailLogin')} tone={loginTone}>{loginText}</DetailRow>
                  <DetailRow label={t('detailProxy')} tone={proxyTone}>{proxyText}</DetailRow>
                  {statusView.clashDirectNode === true ? (
                    <DetailRow label={t('detailClash')} tone="warn">{t('clashOn')}</DetailRow>
                  ) : null}
                  {statusView.hostPluginError !== undefined ? (
                    <DetailRow label={t('detailHostPlugin')} tone="error">
                      <code style={codeStyle}>{statusView.hostPluginError}</code>
                    </DetailRow>
                  ) : null}
                </>
              ) : (
                <>
                  <DetailRow label={t('detailExec')} tone="error">{t('missingCliRow')}</DetailRow>
                  <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.6 }}>
                    <code style={codeStyle}>{isWindows ? t('installWin') : t('installUnix')}</code>
                  </p>
                  <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--dsw-alias-label-secondary)' }}>
                    {t('loginCmdHint')}
                  </p>
                </>
              )}
            </div>
            <details style={{ borderTop: '1px solid var(--dsw-alias-border-l2)' }}>
              <summary style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 12, color: 'var(--dsw-alias-label-secondary)' }}>
                {t('netDetails')}
              </summary>
              <p style={{ margin: 0, padding: '0 14px 12px', fontSize: 12.5, lineHeight: 1.65, color: 'var(--dsw-alias-label-secondary)' }}>
                {t('proxyHint')}
              </p>
            </details>
          </div>

          {/* 2 — 连通性测试 */}
          {statusView.found ? (
            <>
              <h3 style={{ fontSize: 15, margin: '16px 0 6px' }}>{t('probeSection')}</h3>
              <p style={helpText}>{t('probeHelp')}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={probe === 'running'}
                  onClick={() => {
                    setProbe('running')
                    void runProbe().then(
                      (next) => setProbe(next.kind),
                      () => setProbe('failed'),
                    )
                  }}
                  style={{
                    ...buttonBase,
                    borderColor: 'var(--dsw-alias-border-l2)',
                    background: 'transparent',
                    color: 'var(--dsw-alias-label-primary)',
                    opacity: probe === 'running' ? 0.6 : 1,
                    cursor: probe === 'running' ? 'default' : 'pointer',
                  }}
                >
                  {probe === 'running' ? t('probeRunning') : t('probe')}
                </button>
                {probe !== 'idle' && probe !== 'running' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: toneText[probeTone[probe]] }}>
                    <StatusDot tone={probeTone[probe]} />
                    {t(probeResultKey[probe])}
                  </span>
                ) : null}
              </div>
            </>
          ) : null}

          {/* 3 — 子代理模型 */}
          <h3 style={{ fontSize: 15, margin: '16px 0 6px' }}>{t('picker')}</h3>
          <p style={helpText}>{t('pickerHelp')}</p>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--dsw-alias-border-l2)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--dsw-alias-label-secondary)' }}>{t('using')}</span>
              <code style={{ fontSize: 13, color: 'var(--dsw-alias-label-primary)' }}>{composed}</code>
              {dirty ? <span style={pendingBadge}>{t('pendingBadge')}</span> : <span style={liveBadge}>{t('live')}</span>}
            </div>
            {showEffort ? (
              <>
                <div style={heading}>{t('effort')}</div>
                <div style={{ ...row, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {efforts.map((effort) => {
                    const selected = choice.effort === effort
                    const key = EFFORT_KEYS[effort as keyof typeof EFFORT_KEYS] ?? 'effortHigh'
                    return (
                      <button
                        key={effort}
                        type="button"
                         disabled={!writable}
                        onClick={() => setField('effort', effort)}
                        style={{
                          ...buttonBase,
                          padding: '6px 12px',
                          borderColor: selected
                            ? 'var(--dsw-alias-state-business-primary)'
                            : 'var(--dsw-alias-border-l2)',
                          background: selected ? 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent)' : 'transparent',
                          color: 'var(--dsw-alias-label-primary)',
                           opacity: writable ? 1 : 0.6,
                           cursor: writable ? 'pointer' : 'default',
                        }}
                      >
                        {t(key)}
                        {selected ? ' ✓' : ''}
                      </button>
                    )
                  })}
                </div>
                <div style={divider} />
              </>
            ) : null}
            {showFast ? (
              <>
                <div style={heading}>{t('options')}</div>
                <label style={{ ...row, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{t('fast')}</span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={choice.fast}
                     disabled={!writable}
                    onChange={event => setField('fast', event.target.checked)}
                  />
                </label>
                <div style={divider} />
              </>
            ) : null}
            <div style={heading}>{t('model')}</div>
            <div style={row}>
              <select
                value={choice.model}
                 disabled={!writable}
                onChange={event => setField('model', event.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid var(--dsw-alias-border-l2)',
                  borderRadius: 6,
                  background: 'var(--dsw-alias-bg-layer-1)',
                  color: 'var(--dsw-alias-label-primary)',
                }}
              >
                {families.map(item => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </div>
            <div style={divider} />
            <div style={heading}>{t('customHeading')}</div>
            <div style={{ ...row, display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <input
                aria-label={t('modelCustom')}
                placeholder={t('modelCustom')}
                value={custom}
                 disabled={!writable}
                onChange={event => setCustom(event.target.value)}
                style={{
                  flex: 1,
                  minWidth: 180,
                  padding: '4px 8px',
                  border: '1px solid var(--dsw-alias-border-l2)',
                  borderRadius: 6,
                  background: 'var(--dsw-alias-bg-layer-1)',
                  color: 'var(--dsw-alias-label-primary)',
                }}
              />
              <button
                type="button"
                 disabled={!writable || custom.trim() === ''}
                onClick={() => {
                  const next = custom.trim()
                  setCustom('')
                  applyChoice({ model: next, effort: choice.effort, fast: choice.fast })
                }}
                style={{
                  ...buttonBase,
                  borderColor: 'var(--dsw-alias-border-l2)',
                  background: 'transparent',
                  color: 'var(--dsw-alias-label-primary)',
                   opacity: !writable || custom.trim() === '' ? 0.5 : 1,
                   cursor: !writable || custom.trim() === '' ? 'default' : 'pointer',
                }}
              >
                {t('modelApply')}
              </button>
            </div>
          </div>
        </>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '12px 0 4px', borderTop: '1px solid var(--dsw-alias-border-l2)' }}>
        {appliedFlash ? <span style={{ flex: 1, fontSize: 12, color: toneText.ok }}>{t('applied')}</span> : null}
        {saveError ? <span style={{ flex: 1, fontSize: 12, color: toneText.error }}>{t('saveFailed')}</span> : null}
        {dirty ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => { setDraft(null); setSaveError(false) }}
            style={{
              appearance: 'none',
              border: '1px solid var(--dsw-alias-border-l2)',
              borderRadius: 8,
              padding: '5px 14px',
              font: 'inherit',
              fontSize: 13,
              lineHeight: 1.5,
              background: 'none',
              color: 'var(--dsw-alias-label-secondary)',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.4 : 1,
            }}
          >
            {t('undo')}
          </button>
        ) : null}
        <button
          type="button"
          disabled={!writable || !dirty}
          onClick={() => applyChoice(choice)}
          style={{
            appearance: 'none',
            border: '1px solid transparent',
            borderRadius: 8,
            padding: '5px 14px',
            font: 'inherit',
            fontSize: 13,
            lineHeight: 1.5,
            background: 'var(--dsw-alias-label-primary)',
            color: 'var(--dsw-alias-bg-layer-3)',
            cursor: !writable || !dirty ? 'default' : 'pointer',
            opacity: !writable || !dirty ? 0.4 : 1,
          }}
        >
          {saving ? t('saving') : t('modelApply')}
        </button>
      </div>
      </div>
      ) : null}
    </li>
  )
}
