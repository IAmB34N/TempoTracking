import { useRef, type ChangeEvent } from 'react'
import { IconLayout, IconTrash } from '../components/Icons'
import { Logo } from '../components/Logo'
import { Button, Toggle, TopBar, useConfirm, useToast } from '../components/ui'
import { APP_MOTTO, APP_NAME } from '../lib/labels'
import { defaultLayout, SCALE_LABELS, setScale, type DockScale } from '../lib/layout'
import { navigate, routes } from '../lib/router'
import { STEP_KEYS, STEP_LABELS } from '../lib/settings'
import { parseState, serialize } from '../lib/storage'
import { useStore } from '../state/store'
import './Settings.css'

const SCALES: readonly DockScale[] = ['sm', 'md', 'lg']
const APP_VERSION = __APP_VERSION__

/** File name for an export made on the given date: tempo-export-YYYY-MM-DD.json */
export function exportFileName(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `tempo-export-${y}-${m}-${d}.json`
}

export default function Settings() {
  const store = useStore()
  const { settings } = store.state
  const confirm = useConfirm()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const onExport = () => {
    const json = serialize({ version: 1, games: store.state.games, teams: store.state.teams, settings: store.state.settings })
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportFileName(new Date())
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Give the browser a moment to start the download before revoking.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.show('Export ready', { tone: 'success' })
  }

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const parsed = parseState(text)
      const ok = await confirm({
        title: 'Import data?',
        message: `Replace all current data with the imported file? It contains ${parsed.games.length} ${parsed.games.length === 1 ? 'game' : 'games'} and ${parsed.teams.length} ${parsed.teams.length === 1 ? 'team' : 'teams'}.`,
        confirmLabel: 'Replace',
        danger: true,
      })
      if (!ok) return
      store.importState(parsed)
      toast.show('Data imported', { tone: 'success' })
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Could not read the file'
      toast.show(`Import failed: ${reason}`, { tone: 'danger', duration: 3500 })
    }
  }

  const onClearAll = async () => {
    const ok = await confirm({
      title: 'Clear all data?',
      message: 'Every game, team and setting will be removed from this device. This cannot be undone.',
      confirmLabel: 'Clear everything',
      danger: true,
    })
    if (!ok) return
    store.clearAll()
    toast.show('All data cleared', { tone: 'danger' })
  }

  const onResetLayout = async () => {
    const ok = await confirm({
      title: 'Reset button layout?',
      message: 'All tracking-page buttons go back to their default size and position.',
      confirmLabel: 'Reset',
    })
    if (!ok) return
    store.setLayout(defaultLayout())
    toast.show('Layout reset', { tone: 'success' })
  }

  return (
    <div className="page settings">
      <TopBar title="Settings" back={routes.home()} />
      <div className="page-content">
        <section className="card" aria-labelledby="settings-steps-title">
          <div className="card-title">
            <h2 id="settings-steps-title" className="section-title">Tracking steps</h2>
          </div>
          <p className="muted small settings-help">Disabled steps are skipped while tracking.</p>
          {!settings.steps.setLocation && (
            <p className="settings-note" role="note">
              You&apos;ll be asked which team set the ball instead.
            </p>
          )}
          <div className="settings-toggles">
            {STEP_KEYS.map((key) => (
              <div key={key} data-testid={`settings-toggle-${key}`}>
                <Toggle
                  id={`settings-step-${key}`}
                  checked={settings.steps[key]}
                  onChange={(v) => store.updateSteps({ [key]: v })}
                  label={STEP_LABELS[key].title}
                  description={STEP_LABELS[key].help}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="card" aria-labelledby="settings-appearance-title">
          <div className="card-title">
            <h2 id="settings-appearance-title" className="section-title">Appearance</h2>
          </div>
          <div data-testid="settings-dark">
            <Toggle
              id="settings-dark-mode"
              checked={settings.darkMode}
              onChange={(darkMode) => store.updateSettings({ darkMode })}
              label="Dark mode"
              description="Switch the whole app to a dark color scheme."
            />
          </div>
        </section>

        <section className="card" aria-labelledby="settings-sets-title">
          <div className="card-title">
            <h2 id="settings-sets-title" className="section-title">Sets</h2>
          </div>
          <div data-testid="settings-show-set">
            <Toggle
              id="settings-show-set-number"
              checked={settings.showSetNumber}
              onChange={(showSetNumber) => store.updateSettings({ showSetNumber })}
              label="Show set number"
              description="Shows the 'Set N' label on the tracking page and the New Set button."
            />
          </div>
        </section>

        <section className="card" aria-labelledby="settings-buttons-title">
          <div className="card-title">
            <h2 id="settings-buttons-title" className="section-title">Buttons</h2>
          </div>
          <div className="stack">
            <div className="settings-field">
              <span className="label" id="settings-scale-label">
                Button size
              </span>
              <div className="segmented settings-segmented" role="group" aria-labelledby="settings-scale-label">
                {SCALES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={settings.layout.scale === s}
                    data-testid={`settings-scale-${s}`}
                    onClick={() => store.setLayout(setScale(settings.layout, s))}
                  >
                    {SCALE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <p className="muted small">Move and resize the tracking-page buttons. They can never cover the court or the header.</p>
            <div className="settings-actions">
              <Button variant="secondary" icon={<IconLayout size={18} />} onClick={() => navigate(routes.layout())} data-testid="settings-customize">
                Customize layout
              </Button>
              <Button variant="outline" onClick={() => void onResetLayout()} data-testid="settings-reset-layout">
                Reset layout
              </Button>
            </div>
          </div>
        </section>

        <section className="card" aria-labelledby="settings-data-title">
          <div className="card-title">
            <h2 id="settings-data-title" className="section-title">Data</h2>
          </div>
          <div className="stack">
            <p className="muted small">Everything is stored on this device. Export a backup or move your data to another phone.</p>
            <div className="settings-actions">
              <Button variant="primary" onClick={onExport} data-testid="settings-export">
                Export JSON
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()} data-testid="settings-import">
                Import JSON
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="visually-hidden"
                tabIndex={-1}
                aria-hidden
                data-testid="settings-import-file"
                onChange={(e) => void onImportFile(e)}
              />
            </div>
            <div className="settings-danger">
              <Button variant="danger" icon={<IconTrash size={18} />} onClick={() => void onClearAll()} data-testid="settings-clear">
                Clear all data
              </Button>
            </div>
          </div>
        </section>

        <section className="card settings-about" aria-labelledby="settings-about-title">
          <h2 id="settings-about-title" className="visually-hidden">
            About
          </h2>
          <Logo size="md" />
          <p className="logo-motto settings-motto">{APP_MOTTO}</p>
          <div className="settings-version mono">
            {APP_NAME} v{APP_VERSION}
          </div>
          <p className="muted small center">Works offline — install it from your browser menu.</p>
        </section>
      </div>
    </div>
  )
}
