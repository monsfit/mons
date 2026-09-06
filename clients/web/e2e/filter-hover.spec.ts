import { expect, test } from '@playwright/test'

test('shows selection controls only when needed and keeps selections after Done', async ({
  page,
}) => {
  await page.goto('/foods')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Filter food', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Food filters', exact: true })
  await expect(dialog.getByRole('button', { name: 'Clear restaurants' })).toHaveCount(0)
  await dialog.getByRole('option', { name: '7-Eleven', exact: true }).click()
  await expect(dialog.getByText('1 selected', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('option', { name: '7-Eleven', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await dialog.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Remove restaurant: 7-Eleven', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Filter food', exact: true }).click()
  await dialog.getByRole('button', { name: 'Clear restaurants' }).click()
  await expect(dialog.getByText('1 selected', { exact: true })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Close food filters', exact: true }).click()
  await expect(dialog).toHaveCount(0)
})

test('keeps the menu anchor mounted through selections and toggles or switches on click', async ({
  page,
}) => {
  await page.goto('/foods')
  await page.waitForLoadState('networkidle')
  const trigger = page.getByRole('button', { name: 'Filter category', exact: true })
  await trigger.click()
  const anchor = await trigger.elementHandle()
  const dialog = page.getByRole('dialog', { name: 'Category filters', exact: true })
  const menu = await dialog.elementHandle()
  await page.getByRole('option', { name: /^Beverages/ }).click()
  await expect(
    page.getByRole('button', { name: 'Remove category: Beverages', exact: true }),
  ).toBeVisible()
  await expect(dialog).toBeVisible()
  expect(await anchor?.evaluate((element) => element.isConnected)).toBe(true)
  expect(await menu?.evaluate((element) => element.isConnected)).toBe(true)
  await trigger.click()
  await expect(dialog).toBeHidden()
  await trigger.click()
  await expect(dialog).toBeVisible()
  const source = page.getByRole('button', { name: 'Filter source', exact: true })
  await source.click()
  await expect(page.getByRole('dialog', { name: 'Source filters', exact: true })).toBeVisible()
  await expect(dialog).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(source).toBeFocused()
})

test('hover opens without stealing focus, bridges into the menu, and dismisses on leave', async ({
  page,
}) => {
  await page.goto('/foods')
  await page.waitForLoadState('networkidle')
  const search = page.getByRole('textbox', { name: 'Search foods', exact: true })
  await search.focus()
  const trigger = page.getByRole('button', { name: 'Filter source', exact: true })
  const dialog = page.getByRole('dialog', { name: 'Source filters', exact: true })
  await trigger.hover()
  await expect(dialog).toBeVisible()
  await expect(search).toBeFocused()
  await dialog.hover()
  await page.waitForTimeout(400)
  await expect(dialog).toBeVisible()
  await page.mouse.move(1100, 100)
  await expect(dialog).toBeHidden()
  await trigger.click()
  await expect(dialog).toBeVisible()
  await page.mouse.move(1100, 100)
  await page.waitForTimeout(400)
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(dialog).toBeVisible()
})
