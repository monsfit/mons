import { expect, test } from '@playwright/test'

test('expands abbreviated sources and searches by abbreviation', async ({ page }) => {
  await page.goto('/foods')
  await page.waitForLoadState('networkidle')
  const firstFood = page.locator('[data-slot="table-cell"]').first()
  await expect(firstFood.getByLabel('Verified scientific source')).toBeVisible()
  const firstSource = page.locator('[data-slot="table-cell"]').nth(1)
  await expect(firstSource.locator('[data-slot="badge"]')).toHaveText('AFCD')
  await expect(firstSource.getByLabel('Verified scientific source')).toHaveCount(0)
  await page.getByRole('button', { name: 'About AFCD', exact: true }).first().click()
  await expect(page.getByRole('dialog', { name: 'AFCD source details' })).toContainText(
    'Australian Food Composition Database',
  )
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Filter source', exact: true }).click()
  await page.getByRole('button', { name: 'Explain source abbreviations' }).click()
  await expect(page.getByRole('dialog', { name: 'Source abbreviations' })).toContainText(
    'Composition of Foods Integrated Dataset',
  )
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Source filters', exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: 'Search data sources' }).fill('OFF')
  await expect(
    page.getByRole('option', { name: 'Australian Food Composition Database', exact: true }),
  ).toHaveCount(0)
  await expect(page.getByRole('option', { name: 'Open Food Facts', exact: true })).toContainText(
    'OFF',
  )
})
