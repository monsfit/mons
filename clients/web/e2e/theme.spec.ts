import { expect, test } from '@playwright/test'

test('follows the system theme and persists a manual choice across pages and reloads', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/foods')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('html')).toHaveClass('dark')
  await page.getByRole('button', { name: 'Toggle light and dark mode' }).click()
  await expect(page.locator('html')).toHaveClass('light')
  await page.getByRole('button', { name: 'Filter source', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Source filters', exact: true })
  await expect(dialog).toBeVisible()
  await expect(page.locator('.dark')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.locator('[data-slot=table-row] a').first().click()
  await expect(page.getByRole('heading', { name: 'Nutrition Facts', exact: true })).toBeVisible()
  await expect(page.locator('html')).toHaveClass('light')
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.locator('html')).toHaveClass('light')
  await page.getByRole('button', { name: 'Toggle light and dark mode' }).click()
  await expect(page.locator('html')).toHaveClass('dark')
  await page.goto('/')
  await expect(page.locator('html')).toHaveClass('dark')
  await expect(page.getByRole('button', { name: 'Toggle light and dark mode' })).toBeVisible()
})
