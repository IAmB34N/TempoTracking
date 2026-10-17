import { defaultLayout, validateLayout, type LayoutConfig } from './layout'

export const STEP_KEYS = ['setLocation', 'hitLocation', 'whoSet', 'setHeight', 'whoHit', 'hitResult'] as const
export type StepKey = (typeof STEP_KEYS)[number]

export const STEP_LABELS: Record<StepKey, { title: string; help: string }> = {
  setLocation: { title: 'Where the ball was set from', help: 'Tap the court to mark the set origin. Also picks the team.' },
  hitLocation: { title: 'Where the ball was hit from', help: 'Second court tap marking the attack origin.' },
  whoSet: { title: 'Who set the ball', help: 'Libero, setter or another position and jersey number.' },
  setHeight: { title: 'How high the set was', help: 'Minus, zero, fast, tempo, slow or bump set.' },
  whoHit: { title: 'Who hit the ball', help: 'Attack position and jersey number.' },
  hitResult: { title: 'Result of the hit', help: 'Kill, not a kill, tip, roll, out, net, blocked or other.' },
}

export type StepSettings = Record<StepKey, boolean>

export interface Settings {
  steps: StepSettings
  darkMode: boolean
  /** When false the "Set N" label and the New Set button are hidden. */
  showSetNumber: boolean
  layout: LayoutConfig
}

export function defaultSettings(prefersDark = false): Settings {
  return {
    steps: { setLocation: true, hitLocation: true, whoSet: true, setHeight: true, whoHit: true, hitResult: true },
    darkMode: prefersDark,
    showSetNumber: true,
    layout: defaultLayout(),
  }
}

/** Merge unknown/partial data over defaults so new settings keys never break old saves. */
export function normalizeSettings(raw: unknown, prefersDark = false): Settings {
  const d = defaultSettings(prefersDark)
  if (!raw || typeof raw !== 'object') return d
  const r = raw as Partial<Record<keyof Settings, unknown>>
  const steps = { ...d.steps }
  if (r.steps && typeof r.steps === 'object') {
    for (const k of STEP_KEYS) {
      const v = (r.steps as Record<string, unknown>)[k]
      if (typeof v === 'boolean') steps[k] = v
    }
  }
  return {
    steps,
    darkMode: typeof r.darkMode === 'boolean' ? r.darkMode : d.darkMode,
    showSetNumber: typeof r.showSetNumber === 'boolean' ? r.showSetNumber : d.showSetNumber,
    layout: validateLayout(r.layout),
  }
}
