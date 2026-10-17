import { expect, type Page } from '@playwright/test'

export const STORAGE_KEY = 'tempo.v1'

/** Click the confirming button of the open confirm dialog. */
export async function confirmDialog(page: Page) {
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.locator('.modal-actions .btn-primary, .modal-actions .btn-danger').click()
  await expect(dialog).toBeHidden()
}

export async function readState(page: Page): Promise<any> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), STORAGE_KEY)
}

/** Add jersey numbers to a position input on the New Game page. */
export async function addNumbers(page: Page, teamPrefix: 'a' | 'b', position: string, numbers: string[]) {
  const input = page.locator(`#${teamPrefix}-${position}`)
  for (const n of numbers) {
    await input.fill(n)
    await input.press('Enter')
  }
}

/** Create a game through the UI and return its id. */
export async function createGame(page: Page, nameA = 'Hawks', nameB = 'Tigers') {
  await page.goto('/#/new')
  await page.getByTestId('team-name-0').fill(nameA)
  await page.getByTestId('team-name-1').fill(nameB)
  await addNumbers(page, 'a', 'setter', ['7'])
  await addNumbers(page, 'a', 'libero', ['3'])
  await addNumbers(page, 'a', 'outside', ['1', '12'])
  await addNumbers(page, 'a', 'middle', ['15'])
  await addNumbers(page, 'b', 'setter', ['4'])
  await addNumbers(page, 'b', 'outside', ['6'])
  await page.getByTestId('start-game').click()
  await expect(page).toHaveURL(/#\/game\/[^/]+$/)
  const id = decodeURIComponent(page.url().split('#/game/')[1]!)
  return id
}

/** Tap the court in Team A's half (left half when horizontal, top half when vertical). */
export async function tapCourtTeamA(page: Page, fx = 0.3, fy = 0.3) {
  const court = page.getByTestId('track-court').locator('svg')
  await expect(court).toBeVisible()
  const box = (await court.boundingBox())!
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy)
}

export async function option(page: Page, value: string) {
  await page.getByTestId(`flow-option-${value}`).click()
}

/** Log one complete set for Team A: setter #7, tempo, outside #12, kill. */
export async function logKill(page: Page) {
  await tapCourtTeamA(page, 0.3, 0.3)
  await tapCourtTeamA(page, 0.4, 0.6)
  await option(page, 'setter')
  await option(page, '7')
  await option(page, 'tempo')
  await option(page, 'outside')
  await option(page, '12')
  await option(page, 'kill')
  await expect(page.getByTestId('flow-panel')).toBeHidden()
}
