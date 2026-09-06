import { expect, test } from '@playwright/test'

test('sorts full results, persists filters and sorting, and resets scroll pages', async ({
  page,
}) => {
  const kinds = encodeURIComponent(JSON.stringify(['raw']))
  await page.goto(`/foods?q=chicken&kinds=${kinds}`)
  await page.waitForLoadState('networkidle')
  const grid = page.getByRole('grid')
  const calories = page.getByRole('button', { name: 'Sort by Calories', exact: true })
  await calories.click()
  await expect(page).toHaveURL(/sort=calories/)
  await expect(grid).not.toHaveAttribute('aria-busy', 'true')
  await expect(
    page.getByRole('columnheader', { name: 'Sort by Calories', exact: true }),
  ).toHaveAttribute('aria-sort', 'ascending')
  const values = () =>
    page
      .locator('[data-slot=table-row]')
      .evaluateAll((rows) =>
        rows.map((row) =>
          Number(
            row.querySelectorAll('[data-slot=table-cell]')[3]?.textContent?.replace(/[^\d.]/g, ''),
          ),
        ),
      )
  await expect
    .poll(async () => {
      const amounts = await values()
      return (
        amounts.length > 1 &&
        amounts.every((value, index) => index === 0 || value >= amounts[index - 1]!)
      )
    })
    .toBe(true)
  await calories.click()
  await expect(page).toHaveURL(/direction=desc/)
  await expect(grid).not.toHaveAttribute('aria-busy', 'true')
  await expect
    .poll(async () => {
      const amounts = await values()
      return (
        amounts.length > 1 &&
        amounts.every((value, index) => index === 0 || value <= amounts[index - 1]!)
      )
    })
    .toBe(true)
  await grid.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect(grid).toHaveAttribute('data-loaded-count', '100')
  await page.reload()
  await expect(grid).toHaveAttribute('data-loaded-count', '50')
  await expect(
    page.getByRole('columnheader', { name: 'Sort by Calories', exact: true }),
  ).toHaveAttribute('aria-sort', 'descending')
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(page).toHaveURL(/sort=calories/)
  await expect(page).toHaveURL(/direction=desc/)
  await expect(page.getByRole('region', { name: 'Active filters' })).toHaveCount(0)
  await calories.click()
  await expect(page).toHaveURL(/sort=&/)
  await expect(grid).toHaveAttribute('data-loaded-count', '50')
})
