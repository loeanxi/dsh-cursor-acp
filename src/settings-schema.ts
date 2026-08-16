/**
 * Settings namespace for the Cursor ACP child model. Callable like schemastery.
 */

import {
  normalizeModel,
  parseEffort,
  splitCursorModelId,
  type CursorEffort,
  type CursorModelChoice,
} from './models.ts'

/** Durable `cursor-acp` section. */
export interface CursorAcpSettings extends CursorModelChoice {}

export const CURSOR_ACP_SETTINGS_NS = 'cursor-acp'

/**
 * Admit a stored section. A legacy full id (`…-high-fast`) is split back
 * into family / effort / fast.
 * @param input - merged layers from the settings service.
 */
export function parseCursorAcpSettings(input: unknown): CursorAcpSettings {
  const rec = input !== null && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {}
  const rawModel = typeof rec.model === 'string' ? normalizeModel(rec.model) : 'auto'
  const split = splitCursorModelId(rawModel)
  const storedAsVariant = rawModel !== 'auto' && split.family !== rawModel
  if (storedAsVariant) {
    return {
      model: split.family,
      effort: split.effort ?? parseEffort(rec.effort),
      fast: split.fast,
    }
  }
  return {
    model: rawModel,
    effort: parseEffort(rec.effort),
    fast: rec.fast === true,
  }
}

/**
 * Schema object the settings service can call and serialize.
 */
export function createCursorAcpSettingsSchema(): ((input: unknown) => CursorAcpSettings) & { toJSON: () => unknown } {
  const parse = (input: unknown): CursorAcpSettings => parseCursorAcpSettings(input)
  return Object.assign(parse, {
    toJSON: () => ({
      type: 'object',
      dict: {
        model: { type: 'string', meta: { default: 'auto' } },
        effort: { type: 'string', meta: { default: 'high' } },
        fast: { type: 'boolean', meta: { default: false } },
      },
    }),
  })
}

export type { CursorEffort }
