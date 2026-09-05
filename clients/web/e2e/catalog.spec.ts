import { expect, test } from '@playwright/test'

test('keeps typing focused while a slow search is in flight', async ({ page }) => {
  await page.goto('/foods?q=chicken')
  await page.waitForLoadState('networkidle')
  const release = Promise.withResolvers<void>()
  await page.route(
    (url) => url.pathname.includes('_server'),
    async (route) => {
      await release.promise
      await route.continue()
    },
  )
  const food = page.getByRole('textbox', { name: 'Search foods', exact: true })
  await food.fill('salmon')
  await page.waitForTimeout(1600)
  try {
    await expect(food).toBeFocused()
    await food.fill('tuna')
    await page.waitForTimeout(350)
  } finally {
    release.resolve()
  }
  await expect(page.getByText('“tuna”', { exact: true })).toBeVisible()
  await expect(food).toHaveValue('tuna')
})

test('keeps simultaneous food and brand edits when their debounces overlap', async ({ page }) => {
  await page.goto('/foods?q=chicken')
  await page.waitForLoadState('networkidle')
  await page.getByRole('textbox', { name: 'Search foods', exact: true }).fill('salmon')
  await page.getByRole('textbox', { name: 'Search brands', exact: true }).fill('tyson')
  await expect(page).toHaveURL(/q=salmon/)
  await expect(page).toHaveURL(/brandQuery=tyson/)
  await expect(page.getByText('“salmon”', { exact: true })).toBeVisible()
  await expect(
    page
      .locator('aside')
      .getByRole('button', { name: /^Tyson\s/ })
      .first(),
  ).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Search brands', exact: true })).toHaveValue(
    'tyson',
  )
})

test('debounces food and facet searches, filters results, and loads more on scroll', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/foods?q=chicken')
  const food = page.getByRole('textbox', { name: 'Search foods', exact: true })
  await expect(food).toHaveValue('chicken')
  await page.waitForLoadState('networkidle')
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('_server')) requests.push(request.url())
  })
  await food.fill('sal')
  await page.waitForTimeout(100)
  await food.fill('salm')
  await page.waitForTimeout(100)
  expect(requests).toHaveLength(0)
  await food.fill('salmon')
  await expect(page).toHaveURL(/q=salmon/)
  await expect(page.getByText('“salmon”', { exact: true })).toBeVisible()
  expect(requests).toHaveLength(1)
  await expect(food).toBeFocused()

  await food.fill('c')
  await page.waitForTimeout(400)
  expect(requests).toHaveLength(1)
  await expect(page.getByText('Type at least 2 characters', { exact: false })).toBeVisible()
  await food.fill('chicken')
  await food.press('Enter')
  await expect(page).toHaveURL(/q=chicken/)
  await expect(page.getByText('“chicken”', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Raw', exact: true }).click()
  await expect(page).toHaveURL(/kind=raw/)
  await expect(page.getByRole('button', { name: 'Raw', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.waitForLoadState('networkidle')
  const rows = page.locator('[data-slot=table-body] [data-slot=table-row]')
  await expect(rows).toHaveCount(50)
  await expect(rows.first()).toContainText('Raw')
  expect(
    await rows.evaluateAll((elements) =>
      elements.every((row) => {
        const cell = row.querySelector('[data-slot=table-cell]')
        const button = cell?.querySelector('button')
        return (
          cell !== null &&
          button !== null &&
          button !== undefined &&
          button.getBoundingClientRect().right <= cell.getBoundingClientRect().right
        )
      }),
    ),
  ).toBe(true)
  const initialIds = await rows.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-key')),
  )
  const scroll = page.getByLabel('Scrollable food results', { exact: true })
  await scroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect.poll(() => rows.count()).toBeGreaterThan(50)
  const ids = await rows.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-key')),
  )
  expect(ids.slice(0, 50)).toEqual(initialIds)
  expect(new Set(ids).size).toBe(ids.length)
  const header = page.locator('[data-slot=table-header]')
  const headerBox = await header.boundingBox()
  const scrollBox = await scroll.boundingBox()
  expect(headerBox).not.toBeNull()
  expect(scrollBox).not.toBeNull()
  expect(Math.abs((headerBox?.y ?? 0) - (scrollBox?.y ?? 0))).toBeLessThan(2)

  await page.getByRole('button', { name: 'All', exact: true }).click()
  await expect(page).toHaveURL(/kind=all/)
  await expect(page.getByRole('button', { name: 'All', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.waitForLoadState('networkidle')
  await expect(rows).toHaveCount(50)
  await expect.poll(() => scroll.evaluate((element) => element.scrollTop)).toBe(0)
  const brands = page.getByRole('textbox', { name: 'Search brands', exact: true })
  await brands.fill('tyson')
  await expect(page).toHaveURL(/brandQuery=tyson/)
  const tyson = page
    .locator('aside')
    .getByRole('button', { name: /^Tyson\s/ })
    .first()
  await tyson.click()
  await expect(page).toHaveURL(/kind=branded/)
  await expect(rows.first()).toContainText(/by Tyson/i)

  const restaurants = page.getByRole('textbox', { name: 'Search restaurants', exact: true })
  await restaurants.fill('applebee')
  await expect(page).toHaveURL(/restaurantQuery=applebee/)
  await page
    .locator('aside')
    .getByRole('button', { name: /Applebee/ })
    .click()
  await expect(page).toHaveURL(/kind=restaurant/)
  await expect(page).toHaveURL(/brandId=all/)
  await expect(rows.first()).toContainText(/Applebee/)
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(page).toHaveURL(/kind=all/)
  await food.fill('zzzznomatchingfoodzzzz')
  await expect(page.getByText('No matching foods', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})
