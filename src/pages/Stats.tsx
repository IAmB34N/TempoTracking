import { useMemo, useState } from 'react'
import { Button, TopBar } from '../components/ui'
import { HEIGHT_LABELS, RESULT_LABELS } from '../lib/labels'
import { navigate, routes } from '../lib/router'
import { formatPct, roundPct, setNumbersIn, sharesSummingTo100, summarize, teamPlays, type Line, type Summary } from '../lib/stats'
import { HIT_RESULTS, SET_HEIGHTS, type Game, type TeamIndex } from '../lib/types'
import { useStore } from '../state/store'
import './Stats.css'

type SetFilter = 'all' | number

export default function Stats({ gameId }: { gameId: string }) {
  const { getGame } = useStore()
  const game = getGame(gameId)

  if (!game) {
    return (
      <div className="page">
        <TopBar title="Stats" back={routes.home()} />
        <div className="page-content">
          <div className="empty">Game not found.</div>
          <Button variant="primary" size="lg" onClick={() => navigate(routes.home())}>
            Home
          </Button>
        </div>
      </div>
    )
  }

  return <StatsView game={game} />
}

function StatsView({ game }: { game: Game }) {
  const [filter, setFilter] = useState<SetFilter>('all')
  const setNumbers = useMemo(() => setNumbersIn(game), [game])
  // Fall back to "All" if the selected set no longer exists (e.g. after deletions).
  const activeFilter: SetFilter = filter === 'all' || setNumbers.includes(filter) ? filter : 'all'
  const setNumber = activeFilter === 'all' ? undefined : activeFilter

  const summaries = useMemo(
    () => [summarize(teamPlays(game, 0, setNumber)), summarize(teamPlays(game, 1, setNumber))] as const,
    [game, setNumber],
  )
  const [a, b] = game.teams
  const subtitle = `${a.name} vs ${b.name}`
  const scopeLabel = activeFilter === 'all' ? 'all sets' : `Set ${activeFilter}`

  return (
    <div className="page">
      <TopBar title="Stats" backFallback={routes.game(game.id)} subtitle={subtitle} />
      <div className="page-content">
        <div className="stats-toolbar">
          <div className="stats-filter">
            <div className="segmented" role="group" aria-label="Filter by set number">
              <button type="button" aria-pressed={activeFilter === 'all'} onClick={() => setFilter('all')}>
                All
              </button>
              {setNumbers.map((n) => (
                <button key={n} type="button" aria-pressed={activeFilter === n} onClick={() => setFilter(n)}>
                  Set {n}
                </button>
              ))}
            </div>
          </div>
          <p className="stats-note">
            Setting % is kills ÷ sets. Errors are out, net and blocked; Efficiency is (kills − errors) ÷ sets. Showing {scopeLabel}.
          </p>
        </div>

        <div className="stats-teams">
          <TeamCard game={game} teamIndex={0} summary={summaries[0]} />
          <TeamCard game={game} teamIndex={1} summary={summaries[1]} />
        </div>

        <section className="card" aria-labelledby="stats-h2h-title">
          <div className="card-title">
            <h2 id="stats-h2h-title" className="section-title">
              Setting % head-to-head
            </h2>
          </div>
          <div className="h2h">
            <H2HRow name={a.name} teamIndex={0} summary={summaries[0]} />
            <H2HRow name={b.name} teamIndex={1} summary={summaries[1]} />
          </div>
          <p className="h2h-sub h2h-sentence">
            {h2hSentence(a.name, b.name, summaries[0], summaries[1])}
          </p>
        </section>

        {(summaries[0].sets > 0 || summaries[1].sets > 0) && (
          <div className="stats-teams">
            {summaries[0].sets > 0 && <BreakdownCard game={game} teamIndex={0} summary={summaries[0]} />}
            {summaries[1].sets > 0 && <BreakdownCard game={game} teamIndex={1} summary={summaries[1]} />}
          </div>
        )}
      </div>
    </div>
  )
}

function TeamHeader({ game, teamIndex, id }: { game: Game; teamIndex: TeamIndex; id: string }) {
  return (
    <h2 className="stats-team-name" id={id}>
      <span className={teamIndex === 0 ? 'badge badge-a' : 'badge badge-b'} aria-label={`Team ${teamIndex === 0 ? 'A' : 'B'}`}>
        {teamIndex === 0 ? 'A' : 'B'}
      </span>
      <span>{game.teams[teamIndex].name}</span>
    </h2>
  )
}

function TeamCard({ game, teamIndex, summary }: { game: Game; teamIndex: TeamIndex; summary: Summary }) {
  const name = game.teams[teamIndex].name
  const headingId = `stats-team-${teamIndex}`
  return (
    <section className={['card', teamIndex === 0 ? 'card-a' : 'card-b'].join(' ')} aria-labelledby={headingId}>
      <div className="card-title">
        <TeamHeader game={game} teamIndex={teamIndex} id={headingId} />
      </div>
      {summary.sets === 0 ? (
        <div className="empty stats-empty">No sets logged for {name} yet</div>
      ) : (
        <div className="stats-tiles">
          <div className="stat-tile stat-tile-primary stats-tile-pct" data-testid={`stats-setting-pct-${teamIndex}`} title="Kills divided by sets">
            <div className="stat-value">{formatPct(summary.settingPct)}</div>
            <div className="stat-label">Setting %</div>
            <div className="stat-caption">kills ÷ sets</div>
          </div>
          <Tile label="Sets" value={String(summary.sets)} />
          <Tile label="Kills" value={String(summary.kills)} />
          <Tile label="Errors" value={String(summary.errors)} caption="out + net + blocked" />
          <Tile label="Efficiency" value={formatPct(summary.efficiency)} caption="(kills − errors) ÷ sets" />
        </div>
      )}
    </section>
  )
}

function Tile({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <div className="stat-tile">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {caption && <div className="stat-caption">{caption}</div>}
    </div>
  )
}

function H2HRow({ name, teamIndex, summary }: { name: string; teamIndex: TeamIndex; summary: Summary }) {
  const pct = summary.settingPct
  const width = pct === null ? 0 : Math.max(0, Math.min(100, pct * 100))
  const label = formatPct(pct)
  return (
    <div className="h2h-row">
      <span className={['h2h-name', teamIndex === 0 ? 'text-a' : 'text-b'].join(' ')}>{name}</span>
      <div
        className={['bar', teamIndex === 1 ? 'bar-b' : ''].filter(Boolean).join(' ')}
        role="meter"
        aria-label={`${name} setting percentage`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct === null ? undefined : Math.round(width * 10) / 10}
        aria-valuetext={pct === null ? 'No sets logged' : label}
      >
        <span style={{ width: `${width}%` }} />
      </div>
      <span className="h2h-value">{label}</span>
    </div>
  )
}

function h2hSentence(nameA: string, nameB: string, a: Summary, b: Summary): string {
  if (a.settingPct === null && b.settingPct === null) return 'No sets logged yet.'
  if (a.settingPct === null) return `Only ${nameB} has sets logged so far.`
  if (b.settingPct === null) return `Only ${nameA} has sets logged so far.`
  // Compare the values as displayed (0.1 pt) so the lead always reconciles with the two rows above.
  const ra = roundPct(a.settingPct)
  const rb = roundPct(b.settingPct)
  const diff = Math.abs(ra - rb)
  if (diff < 0.05) return `${nameA} and ${nameB} are level.`
  const leader = ra > rb ? nameA : nameB
  return `${leader} leads by ${diff.toFixed(1)} percentage points.`
}

function BreakdownCard({ game, teamIndex, summary }: { game: Game; teamIndex: TeamIndex; summary: Summary }) {
  const headingId = `stats-breakdown-${teamIndex}`
  const setters = useMemo(() => sortedLines(summary.bySetter), [summary])
  const hitters = useMemo(() => sortedLines(summary.byHitter), [summary])
  // Shares are reconciled so the visible column adds up (largest-remainder rounding). Sets without a
  // result are counted as a trailing, unrendered bucket so the rows still read as "share of all sets".
  const shares = useMemo(() => sharesSummingTo100([...HIT_RESULTS.map((r) => summary.byResult[r]), summary.noResult]), [summary])
  return (
    <section className={['card', teamIndex === 0 ? 'card-a' : 'card-b'].join(' ')} aria-labelledby={headingId}>
      <div className="card-title">
        <TeamHeader game={game} teamIndex={teamIndex} id={headingId} />
        <span className="muted small">breakdown</span>
      </div>
      <div className="stats-breakdown">
        <LineTable
          title="By set height"
          rowLabel="Height"
          rows={[
            ...SET_HEIGHTS.map((h) => [HEIGHT_LABELS[h], summary.byHeight[h]] as const),
            ...(summary.noHeight.sets > 0 ? [['No height recorded', summary.noHeight] as const] : []),
          ]}
        />
        <LineTable title="By setter" rowLabel="Setter" rows={setters} />
        <LineTable title="By hitter" rowLabel="Hitter" rows={hitters} />
        <div>
          <h3 className="section-title">By result</h3>
          <div className="table-wrap">
            <table className="table stats-table">
              <thead>
                <tr>
                  <th scope="col">Result</th>
                  <th scope="col">Count</th>
                  <th scope="col" className="stats-table-share">
                    Share
                  </th>
                </tr>
              </thead>
              <tbody>
                {HIT_RESULTS.map((r, i) => {
                  const count = summary.byResult[r]
                  return (
                    <tr key={r} className={count === 0 ? 'is-zero' : undefined}>
                      <th scope="row">
                        {RESULT_LABELS[r]}
                      </th>
                      <td>{count}</td>
                      <td>{`${shares[i]!.toFixed(1)}%`}</td>
                    </tr>
                  )
                })}
                {summary.noResult > 0 && (
                  <tr>
                    <th scope="row">No result recorded</th>
                    <td>{summary.noResult}</td>
                    <td>{`${shares[HIT_RESULTS.length]!.toFixed(1)}%`}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

function sortedLines(map: Record<string, Line>): ReadonlyArray<readonly [string, Line]> {
  return Object.entries(map).sort((x, y) => y[1].sets - x[1].sets || y[1].kills - x[1].kills || x[0].localeCompare(y[0]))
}

function LineTable({ title, rowLabel, rows }: { title: string; rowLabel: string; rows: ReadonlyArray<readonly [string, Line]> }) {
  return (
    <div>
      <h3 className="section-title">{title}</h3>
      <div className="table-wrap">
        <table className="table stats-table">
          <thead>
            <tr>
              <th scope="col">{rowLabel}</th>
              <th scope="col">Sets</th>
              <th scope="col">Kills</th>
              <th scope="col">Setting %</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  Nothing recorded
                </td>
              </tr>
            ) : (
              rows.map(([label, line]) => (
                <tr key={label} className={line.sets === 0 ? 'is-zero' : undefined}>
                  <th scope="row">
                    {label}
                  </th>
                  <td>{line.sets}</td>
                  <td>{line.kills}</td>
                  <td>{formatPct(line.settingPct)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
