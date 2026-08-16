import { useEffect, useState, type CSSProperties } from 'react'
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

export interface CursorAcpSettingsScope {
  getSnapshot: () => {
    status: 'loading' | 'ready' | 'unavailable'
    value?: CursorAcpSettingsValue
    writable: boolean
  }
  subscribe: (listener: () => void) => () => void
  set: (field: string, value: unknown) => Promise<void>
}

export interface CursorAcpSectionProps {
  readonly t: (key: CursorAcpKey) => string
  readonly loadStatus: () => Promise<CursorAcpStatusView>
  readonly settingsScope: CursorAcpSettingsScope
}

const EFFORT_KEYS = {
  low: 'effortLow',
  medium: 'effortMedium',
  high: 'effortHigh',
  xhigh: 'effortXhigh',
  max: 'effortMax',
} as const

function choiceFrom(scope: CursorAcpSettingsScope, status: CursorAcpStatusView | 'loading' | 'error'): Required<CursorAcpSettingsValue> {
  const value = scope.getSnapshot().value
  if (status !== 'loading' && status !== 'error') {
    return {
      model: value?.model ?? status.model,
      effort: value?.effort ?? status.effort,
      fast: value?.fast ?? status.fast,
    }
  }
  return {
    model: value?.model ?? 'auto',
    effort: value?.effort ?? 'high',
    fast: value?.fast === true,
  }
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

const card: CSSProperties = {
  marginTop: 16,
  border: '1px solid var(--dsw-alias-border, #333)',
  borderRadius: 10,
  background: 'var(--dsw-alias-bg-elevated, #1e1e1e)',
  overflow: 'hidden',
}

const heading: CSSProperties = {
  padding: '10px 12px 4px',
  fontSize: 11,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
  color: 'var(--dsw-alias-text-secondary, #888)',
}

const row: CSSProperties = {
  padding: '8px 12px 12px',
}

const divider: CSSProperties = {
  height: 1,
  background: 'var(--dsw-alias-border, #333)',
}

export function CursorAcpSection(props: CursorAcpSectionProps) {
  const { t, loadStatus, settingsScope } = props
  const [status, setStatus] = useState<CursorAcpStatusView | 'loading' | 'error'>('loading')
  const [custom, setCustom] = useState('')
  const [draft, setDraft] = useState<Required<CursorAcpSettingsValue> | null>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let cancelled = false
    void loadStatus().then(
      (next) => { if (!cancelled) setStatus(next) },
      () => { if (!cancelled) setStatus('error') },
    )
    return () => { cancelled = true }
  }, [loadStatus])
  useEffect(() => settingsScope.subscribe(() => setTick(n => n + 1)), [settingsScope])
  void tick
  const snap = settingsScope.getSnapshot()
  const writable = snap.writable && snap.status === 'ready'
  const saved = choiceFrom(settingsScope, status)
  const choice = draft ?? saved
  const dirty = draft !== null && !sameChoice(draft, saved)
  const families = status !== 'loading' && status !== 'error' ? status.families : [{ id: 'auto', label: 'Auto', efforts: [], hasFast: false }]
  const family = families.find(item => item.id === choice.model) ?? families[0]
  const efforts = family?.efforts ?? []
  const showEffort = choice.model !== 'auto' && efforts.length > 0
  const showFast = choice.model !== 'auto' && family?.hasFast === true
  const composed = status !== 'loading' && status !== 'error'
    ? previewComposed(choice, status)
    : choice.model

  const setField = (field: keyof Required<CursorAcpSettingsValue>, value: string | boolean): void => {
    setDraft({ ...choice, [field]: value })
  }

  const applyChoice = (next: Required<CursorAcpSettingsValue>): void => {
    void (async () => {
      await settingsScope.set('model', next.model)
      await settingsScope.set('effort', next.effort)
      await settingsScope.set('fast', next.fast)
      setDraft(null)
      try {
        setStatus(await loadStatus())
      } catch {
        setStatus('error')
      }
    })()
  }

  return (
    <section style={{ maxWidth: 640, padding: '8px 0' }}>
      <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>{t('title')}</h2>
      <p style={{ margin: '0 0 12px', lineHeight: 1.5 }}>{t('intro')}</p>
      {status === 'loading' ? <p>{t('loading')}</p> : null}
      {status === 'error' ? <p style={{ color: 'var(--dsw-alias-danger, #c00)' }}>{t('failed')}</p> : null}
      {status !== 'loading' && status !== 'error' ? (
        <>
          <p>{status.found ? t('found') : t('missing')}</p>
          {status.command !== undefined ? (
            <p>
              {t('command')}
              {': '}
              <code>{status.command}</code>
            </p>
          ) : null}
          <h3 style={{ fontSize: 15, margin: '20px 0 6px' }}>{t('picker')}</h3>
          <p style={{ margin: '0 0 8px', lineHeight: 1.5 }}>{t('pickerHelp')}</p>
          <div style={card}>
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
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: selected
                            ? '1px solid var(--dsw-alias-accent, #5BB73B)'
                            : '1px solid var(--dsw-alias-border, #444)',
                          background: selected ? 'color-mix(in srgb, var(--dsw-alias-accent, #5BB73B) 18%, transparent)' : 'transparent',
                          color: 'var(--dsw-alias-text, inherit)',
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
                style={{ width: '100%', padding: '6px 8px' }}
              >
                {families.map(item => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <p style={{ margin: 0, flex: 1, fontSize: 12, color: 'var(--dsw-alias-text-secondary, #888)' }}>
                  {t('using')}
                  {': '}
                  <code>{composed}</code>
                </p>
                <button
                  type="button"
                  disabled={!writable || !dirty}
                  onClick={() => applyChoice(choice)}
                >
                  {t('modelApply')}
                </button>
              </div>
              {dirty ? (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--dsw-alias-text-secondary, #888)' }}>
                  {t('pickerPending')}
                </p>
              ) : null}
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              aria-label={t('modelCustom')}
              placeholder={t('modelCustom')}
              value={custom}
              disabled={!writable}
              onChange={event => setCustom(event.target.value)}
              style={{ flex: 1, minWidth: 180, padding: '4px 8px' }}
            />
            <button
              type="button"
              disabled={!writable || custom.trim() === ''}
              onClick={() => {
                const next = custom.trim()
                setCustom('')
                applyChoice({ model: next, effort: choice.effort, fast: choice.fast })
              }}
            >
              {t('modelApply')}
            </button>
          </div>
          {writable ? null : <p style={{ marginTop: 8 }}>{t('modelUnavailable')}</p>}
          <p>{t(typeof navigator !== 'undefined' && /Win/i.test(navigator.platform) ? 'installWin' : 'installUnix')}</p>
          <p>{t('login')}</p>
        </>
      ) : null}
    </section>
  )
}
