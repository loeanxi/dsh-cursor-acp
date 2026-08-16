/**
 * Cursor CLI model list, family/effort/fast catalog, and spawn argv helpers.
 * Secret-free: only ids/labels.
 */

/** One account-visible Cursor model id. */
export interface CursorModelOption {
  readonly id: string
  readonly label: string
}

/** Thinking / effort suffixes used in Cursor CLI ids. */
export const CURSOR_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const

/** One effort token. */
export type CursorEffort = (typeof CURSOR_EFFORTS)[number]

/** One row after splitting `family-effort-fast`. */
export interface CursorModelVariant {
  readonly id: string
  readonly label: string
  readonly family: string
  readonly familyLabel: string
  readonly effort?: CursorEffort
  readonly fast: boolean
}

/** Picker group: one model family with the efforts/fast it actually lists. */
export interface CursorModelFamily {
  readonly id: string
  readonly label: string
  readonly efforts: readonly CursorEffort[]
  readonly hasFast: boolean
}

/** Settings the picker writes. */
export interface CursorModelChoice {
  readonly model: string
  readonly effort: CursorEffort
  readonly fast: boolean
}

const MODEL_LINE = /^([A-Za-z0-9._[\]=,+-]+)\s+-\s+(.+)$/
const EFFORT_SUFFIX = /-(low|medium|high|xhigh|max)$/

/**
 * Normalize a settings value to a spawn-safe model id.
 * @param model - raw user or stored value.
 */
export function normalizeModel(model: string): string {
  const trimmed = model.trim()
  if (trimmed === '') return 'auto'
  return trimmed.slice(0, 200)
}

/**
 * Whether `value` is a known effort token.
 * @param value - raw stored effort.
 */
export function parseEffort(value: unknown): CursorEffort {
  if (typeof value === 'string' && (CURSOR_EFFORTS as readonly string[]).includes(value)) {
    return value as CursorEffort
  }
  return 'high'
}

/**
 * Strip Fast / effort words from a CLI display label to get the family name.
 * @param label - e.g. `Cursor Grok 4.6 Extra High Fast`.
 */
export function familyLabelFrom(label: string): string {
  return label
    .replace(/\s+Fast$/iu, '')
    .replace(/\s+Extra High$/iu, '')
    .replace(/\s+Low$/iu, '')
    .replace(/\s+Medium$/iu, '')
    .replace(/\s+High$/iu, '')
    .replace(/\s+Max$/iu, '')
    .trim()
}

/**
 * Split a CLI model id into family + optional effort + fast.
 * @param id - e.g. `cursor-grok-4.6-high-fast`.
 */
export function splitCursorModelId(id: string): Pick<CursorModelVariant, 'family' | 'effort' | 'fast'> {
  if (id === 'auto') return { family: 'auto', fast: false }
  let rest = id
  let fast = false
  if (rest.endsWith('-fast')) {
    fast = true
    rest = rest.slice(0, -5)
  }
  const match = EFFORT_SUFFIX.exec(rest)
  if (match === null) return { family: rest, fast }
  return {
    family: rest.slice(0, match.index),
    effort: match[1] as CursorEffort,
    fast,
  }
}

/**
 * Parse `agent models` stdout into options. Always includes `auto`.
 * @param stdout - CLI listing.
 */
export function parseCursorModels(stdout: string): CursorModelOption[] {
  const rows: CursorModelOption[] = []
  const seen = new Set<string>()
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('Available') || trimmed.startsWith('Tip:')) continue
    const match = MODEL_LINE.exec(trimmed)
    if (match === null) continue
    const id = match[1] ?? ''
    const label = (match[2] ?? '').replace(/\s*\(current, default\)\s*$/u, '').trim()
    if (id === '' || seen.has(id)) continue
    seen.add(id)
    rows.push({ id, label: label === '' ? id : label })
  }
  if (!seen.has('auto')) rows.unshift({ id: 'auto', label: 'Auto' })
  return rows
}

/**
 * Group a flat listing into picker families.
 * @param options - `parseCursorModels` rows.
 */
export function catalogFromOptions(options: readonly CursorModelOption[]): {
  readonly variants: readonly CursorModelVariant[]
  readonly families: readonly CursorModelFamily[]
} {
  const variants: CursorModelVariant[] = options.map((option) => {
    const parts = splitCursorModelId(option.id)
    return {
      id: option.id,
      label: option.label,
      family: parts.family,
      familyLabel: parts.family === 'auto' ? option.label : familyLabelFrom(option.label),
      ...(parts.effort === undefined ? {} : { effort: parts.effort }),
      fast: parts.fast,
    }
  })
  const order: string[] = []
  const grouped = new Map<string, CursorModelVariant[]>()
  for (const variant of variants) {
    const list = grouped.get(variant.family)
    if (list === undefined) {
      grouped.set(variant.family, [variant])
      order.push(variant.family)
    } else {
      list.push(variant)
    }
  }
  const families: CursorModelFamily[] = order.map((id) => {
    const list = grouped.get(id) ?? []
    const efforts = CURSOR_EFFORTS.filter(effort => list.some(item => item.effort === effort))
    return {
      id,
      label: list[0]?.familyLabel ?? id,
      efforts,
      hasFast: list.some(item => item.fast),
    }
  })
  return { variants, families }
}

/**
 * Pick an effort this family actually lists.
 * @param wanted - stored effort.
 * @param available - family efforts.
 */
export function clampEffort(wanted: CursorEffort, available: readonly CursorEffort[]): CursorEffort {
  if (available.length === 0) return wanted
  if (available.includes(wanted)) return wanted
  for (const fallback of ['high', 'medium', 'low', 'xhigh', 'max'] as const) {
    if (available.includes(fallback)) return fallback
  }
  return available[0] ?? wanted
}

/**
 * Resolve the CLI `--model` id from the picker choice.
 * Prefers an exact listed id; otherwise uses Cursor's bracket override form.
 * @param choice - settings.
 * @param options - account listing.
 */
export function composeCursorModelId(choice: CursorModelChoice, options: readonly CursorModelOption[]): string {
  const model = normalizeModel(choice.model)
  if (model === 'auto') return 'auto'
  const { variants, families } = catalogFromOptions(options)
  const family = families.find(item => item.id === model)
  const mine = variants.filter(item => item.family === model)
  if (family === undefined && mine.length === 0) return model
  const effort = clampEffort(choice.effort, family?.efforts ?? [])
  const fast = family?.hasFast === true && choice.fast
  const exact = mine.find((item) => {
    const effortOk = (family?.efforts.length ?? 0) === 0 || item.effort === effort
    return effortOk && item.fast === fast
  })
  if (exact !== undefined) return exact.id
  if ((family?.efforts.length ?? 0) > 0) {
    return `${model}[effort=${effort},fast=${fast ? 'true' : 'false'}]`
  }
  if (fast) return `${model}-fast`
  return model
}

/**
 * Insert or replace `--model` before the `acp` subcommand.
 * `auto` omits the flag so the CLI uses its own default.
 * @param args - resolved spawn args (`index.js acp` or `acp`).
 * @param model - desired model id.
 */
export function withModelArgs(args: readonly string[], model: string): string[] {
  const cleaned: string[] = []
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--model') {
      i += 1
      continue
    }
    cleaned.push(args[i] ?? '')
  }
  const normalized = normalizeModel(model)
  if (normalized === 'auto') return cleaned
  const acpAt = cleaned.lastIndexOf('acp')
  if (acpAt === -1) return [...cleaned, '--model', normalized]
  return [...cleaned.slice(0, acpAt), '--model', normalized, ...cleaned.slice(acpAt)]
}
