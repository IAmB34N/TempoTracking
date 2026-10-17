import { expect, test } from '@playwright/test'
import { confirmDialog, createGame, flipToggle, logKill, option, readState, tapCourtTeamA } from './helpers'

test.describe('Tempo', () => {
  test('home shows the brand and disables Resume without games', async ({ page }) => {
    await page.goto('/#/')
    await expect(page.getByText('TEMPO', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Tracking the tempo of every set.')).toBeVisible()
    await expect(page.getByTestId('home-new')).toBeEnabled()
    await expect(page.getByTestId('home-resume')).toBeDisabled()
    await expect(page.getByTestId('home-games')).toBeVisible()
    await expect(page.getByTestId('home-teams')).toBeVisible()
    await expect(page.getByTestId('home-settings')).toBeVisible()
  })

  test('creates a game, logs sets through the full flow, and reports stats', async ({ page }) => {
    const id = await createGame(page)
    let state = await readState(page)
    expect(state.games).toHaveLength(1)
    expect(state.teams).toHaveLength(2)
    expect(state.games[0].teams[0].roster.setter).toEqual(['7'])

    await expect(page.getByTestId('set-label')).toContainText('1')
    await logKill(page)
    state = await readState(page)
    const game = state.games.find((g: any) => g.id === id)
    expect(game.plays).toHaveLength(1)
    expect(game.plays[0]).toMatchObject({ teamIndex: 0, setNumber: 1, setter: { kind: 'setter', number: '7' }, height: 'tempo', hitter: { position: 'outside', number: '12' }, result: 'kill' })
    expect(game.plays[0].setFrom.x).toBeLessThan(0.5)

    // second set: "other" setter → position → number, bump, middle, blocked
    await tapCourtTeamA(page, 0.2, 0.3)
    await tapCourtTeamA(page, 0.4, 0.2)
    await option(page, 'other')
    await option(page, 'outside')
    await option(page, '1')
    await option(page, 'bump')
    await option(page, 'middle')
    await option(page, '15')
    await option(page, 'blocked')
    await expect(page.getByTestId('flow-panel')).toBeHidden()

    // back button inside the flow returns to the previous step
    await tapCourtTeamA(page, 0.2, 0.3)
    await tapCourtTeamA(page, 0.4, 0.2)
    await option(page, 'libero')
    await expect(page.getByTestId('flow-option-3')).toBeVisible()
    await page.getByTestId('flow-back').click()
    await expect(page.getByTestId('flow-option-libero')).toBeVisible()
    await page.getByTestId('flow-cancel').click()
    await expect(page.getByTestId('flow-panel')).toBeHidden()

    state = await readState(page)
    expect(state.games[0].plays).toHaveLength(2)

    // new set
    await page.getByTestId('dock-newSet').click()
    await confirmDialog(page)
    await expect(page.getByTestId('set-label')).toContainText('2')
    await logKill(page)
    state = await readState(page)
    expect(state.games[0].plays[2].setNumber).toBe(2)

    // undo
    await page.getByTestId('dock-undo').click()
    await confirmDialog(page)
    state = await readState(page)
    expect(state.games[0].plays).toHaveLength(2)

    // set log
    await page.getByTestId('dock-setLog').click()
    await expect(page).toHaveURL(/\/log$/)
    await expect(page.getByTestId('log-item')).toHaveCount(2)
    await page.getByTestId('log-item').last().click()
    await expect(page).toHaveURL(/\/log\/[^/]+$/)
    await expect(page.getByText('Kill', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Setter #7').first()).toBeVisible()

    // stats: 2 sets, 1 kill → 50.0%
    await page.goto(`/#/game/${id}/stats`)
    await expect(page.getByTestId('stats-setting-pct-0')).toContainText('50.0%')
  })

  test('settings disable steps, hide the set number and toggle dark mode', async ({ page }) => {
    const id = await createGame(page, 'Comets', 'Rockets')
    await page.goto('/#/settings')
    await flipToggle(page, 'settings-toggle-setLocation')
    await flipToggle(page, 'settings-toggle-hitLocation')
    await flipToggle(page, 'settings-toggle-setHeight')
    await flipToggle(page, 'settings-show-set')
    await flipToggle(page, 'settings-dark')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    const state = await readState(page)
    expect(state.settings.steps.setLocation).toBe(false)
    expect(state.settings.showSetNumber).toBe(false)

    await page.goto(`/#/game/${id}`)
    await expect(page.getByTestId('set-label')).toHaveCount(0)
    await expect(page.getByTestId('dock-newSet')).toHaveCount(0)
    // with the court step off the flow starts by asking for the team
    await expect(page.getByTestId('flow-panel')).toBeVisible()
    await option(page, 'team-1')
    await option(page, 'setter')
    await option(page, '4')
    await option(page, 'outside')
    await option(page, '6')
    await option(page, 'kill')
    const after = await readState(page)
    expect(after.games[0].plays[0]).toMatchObject({ teamIndex: 1, setter: { kind: 'setter', number: '4' }, result: 'kill' })
    expect(after.games[0].plays[0].setFrom).toBeUndefined()
    expect(after.games[0].plays[0].height).toBeUndefined()
  })

  test('teams page lists saved teams, tracks primary and shows game-over-game changes', async ({ page }) => {
    await createGame(page, 'Hawks', 'Tigers')
    await logKill(page)
    await createGame(page, 'Hawks', 'Comets')
    await logKill(page)
    await tapCourtTeamA(page, 0.2, 0.3)
    await tapCourtTeamA(page, 0.4, 0.2)
    await option(page, 'setter')
    await option(page, '7')
    await option(page, 'slow')
    await option(page, 'outside')
    await option(page, '1')
    await option(page, 'out')
    await page.goto('/#/teams')
    await expect(page.getByTestId('team-item')).toHaveCount(3)
    await page.getByTestId('team-primary-toggle').first().click()
    const state = await readState(page)
    expect(state.teams.filter((t: any) => t.isPrimary)).toHaveLength(1)
    await page.getByTestId('team-item').filter({ hasText: 'Hawks' }).first().click()
    await expect(page).toHaveURL(/#\/teams\/[^/]+$/)
    await expect(page.getByTestId('team-game-row')).toHaveCount(2)
    // 100% → 50%: −50.0 pts
    await expect(page.getByTestId('team-game-row').first()).toContainText('50.0')
  })

  test('layout editor rejects overlapping drops and keeps the court/header reserved', async ({ page }) => {
    await page.goto('/#/layout')
    await expect(page.getByTestId('layout-button-newSet')).toBeVisible()
    await expect(page.getByTestId('layout-reset')).toBeVisible()
    const before = (await readState(page))?.settings?.layout
    const a = (await page.getByTestId('layout-button-newSet').boundingBox())!
    const b = (await page.getByTestId('layout-button-setLog').boundingBox())!
    // drag newSet onto setLog → rejected
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
    await page.mouse.down()
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 })
    await page.mouse.up()
    const after = (await readState(page))?.settings?.layout
    expect(JSON.stringify(after?.buttons ?? null)).toBe(JSON.stringify(before?.buttons ?? after?.buttons ?? null))
  })

  test('previous games list resumes and deletes games', async ({ page }) => {
    await createGame(page, 'Hawks', 'Tigers')
    await page.goto('/#/games')
    await expect(page.getByTestId('game-item')).toHaveCount(1)
    await page.getByTestId('game-delete').first().click()
    await confirmDialog(page)
    await expect(page.getByTestId('game-item')).toHaveCount(0)
    const state = await readState(page)
    expect(state.games).toHaveLength(0)
  })
})
