// Deterministic demo data in Tempo's persisted format. Usage:
//   node scripts/seed.mjs > /tmp/seed.json
// Pass the file to scripts/shot.mjs --seed to screenshot pages with data.
const now = Date.UTC(2026, 9, 17, 18, 0, 0)
const day = 86_400_000

const teams = [
  { id: 't_hawks', name: 'Hawks', roster: { libero: ['3'], setter: ['7', '9'], middle: ['12', '15'], outside: ['1', '2', '10'], rightside: ['8'] }, isPrimary: true, createdAt: now - 20 * day, updatedAt: now },
  { id: 't_tigers', name: 'Tigers', roster: { libero: ['5'], setter: ['4'], middle: ['11', '14'], outside: ['6', '13'], rightside: [] }, isPrimary: false, createdAt: now - 20 * day, updatedAt: now },
  { id: 't_comets', name: 'Comets', roster: { libero: [], setter: ['2'], middle: ['9'], outside: ['3', '7'], rightside: ['11'] }, isPrimary: false, createdAt: now - 10 * day, updatedAt: now },
]
const byId = Object.fromEntries(teams.map((t) => [t.id, t]))
const gt = (id) => ({ teamId: id, name: byId[id].name, roster: byId[id].roster })

let seed = 7
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const heights = ['minus', 'zero', 'fast', 'tempo', 'slow', 'bump']
const results = ['kill', 'kill', 'kill', 'notkill', 'tip', 'roll', 'out', 'net', 'blocked', 'other']

function plays(gameId, teamIds, count, createdAt) {
  const out = []
  for (let i = 0; i < count; i++) {
    const teamIndex = rnd() < 0.55 ? 0 : 1
    const roster = byId[teamIds[teamIndex]].roster
    const setterKind = pick(['setter', 'setter', 'setter', 'libero', 'other'])
    const setter = { kind: setterKind }
    if (setterKind === 'other') {
      setter.position = pick(['outside', 'middle', 'rightside', 'other'])
      const list = setter.position === 'other' ? [] : roster[setter.position]
      if (list.length) setter.number = pick(list)
    } else if (roster[setterKind].length) setter.number = pick(roster[setterKind])
    const hitPos = pick(['outside', 'outside', 'middle', 'rightside', 'other'])
    const hitter = { position: hitPos }
    if (hitPos !== 'other' && roster[hitPos].length) hitter.number = pick(roster[hitPos])
    out.push({
      id: `${gameId}_p${i}`,
      gameId,
      teamIndex,
      setNumber: i < count * 0.5 ? 1 : i < count * 0.8 ? 2 : 3,
      createdAt: createdAt + i * 45_000,
      setFrom: { x: 0.15 + rnd() * 0.3, y: 0.2 + rnd() * 0.6 },
      hitFrom: { x: 0.3 + rnd() * 0.2, y: rnd() },
      setter,
      height: pick(heights),
      hitter,
      result: pick(results),
    })
  }
  return out
}

const games = [
  { id: 'g_1', createdAt: now - 14 * day, teams: ['t_hawks', 't_tigers'], n: 24, currentSet: 3 },
  { id: 'g_2', createdAt: now - 7 * day, teams: ['t_comets', 't_hawks'], n: 30, currentSet: 3 },
  { id: 'g_3', createdAt: now - 1 * day, teams: ['t_hawks', 't_comets'], n: 18, currentSet: 2 },
].map((g) => ({
  id: g.id,
  createdAt: g.createdAt,
  updatedAt: g.createdAt + 2 * 3_600_000,
  teams: [gt(g.teams[0]), gt(g.teams[1])],
  currentSet: g.currentSet,
  swapSides: false,
  plays: plays(g.id, g.teams, g.n, g.createdAt),
}))

const state = { version: 1, games, teams, settings: undefined }
process.stdout.write(JSON.stringify(state, null, 2))
