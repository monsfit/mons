import { expect, test } from '@playwright/test'

test('browses by default, combines selections, and removes chips independently', async ({
  page,
}) => {
  await page.goto('/foods')
  const table = page.getByRole('grid')
  const search = page.getByRole('textbox', { name: 'Search foods', exact: true })
  await expect(search).toHaveValue('')
  await expect(page.locator('main').getByRole('textbox', { name: 'Search foods' })).toBeVisible()
  await expect(table).toHaveAttribute('data-loaded-count', '50')
  await page.waitForLoadState('networkidle')
  const release = Promise.withResolvers<void>()
  await page.route(
    (url) => url.pathname.includes('_server'),
    async (route) => {
      await release.promise
      await route.continue()
    },
  )
  await page.getByRole('button', { name: 'Raw', exact: true }).click()
  await page.getByRole('button', { name: 'Branded', exact: true }).click()
  release.resolve()
  await expect(page.getByRole('button', { name: 'Remove type: raw', exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Remove type: branded', exact: true }),
  ).toBeVisible()
  const groups = page.getByRole('listbox', { name: 'Food groups', exact: true })
  await groups.getByRole('option', { name: /^Beverages/ }).click()
  await expect(
    page.getByRole('button', { name: 'Remove group: Beverages', exact: true }),
  ).toBeVisible()
  await groups.getByRole('option', { name: /^Dairy/ }).click()
  await expect(page.getByRole('button', { name: 'Remove group: Dairy', exact: true })).toBeVisible()
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(
    page.getByRole('region', { name: 'Active filters' }).getByRole('button'),
  ).toHaveCount(5)
  await page.getByRole('button', { name: 'Remove group: Dairy', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Remove group: Dairy', exact: true })).toHaveCount(
    0,
  )
  await expect(
    page.getByRole('button', { name: 'Remove group: Beverages', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Active filters' })).toContainText('None')
  await expect(table).toHaveAttribute('data-loaded-count', '50')
  await page.getByRole('button', { name: 'All', exact: true }).click()
  await table.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect(table).toHaveAttribute('data-loaded-count', '100')
})

test('virtualizes and paginates both facet lists independently, then resets on search', async ({
  page,
}) => {
  await page.goto('/foods?q=chicken')
  await page.waitForLoadState('networkidle')
  for (const name of ['Brands', 'Restaurants']) {
    const list = page.getByRole('listbox', { name, exact: true })
    await expect(list).toHaveAttribute('data-loaded-count', '30')
    const first = await list.getByRole('option').first().textContent()
    await list.evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    await expect(list).toHaveAttribute('data-loaded-count', '60')
    expect(await list.getByRole('option').count()).toBeLessThan(15)
    expect(await list.getByRole('option').first().textContent()).not.toBe(first)
  }
  const brands = page.getByRole('listbox', { name: 'Brands', exact: true })
  await page.getByRole('textbox', { name: 'Search brands', exact: true }).fill('tyson')
  await expect(brands.getByRole('option').first()).toContainText(/Tyson/i)
  await expect.poll(() => brands.evaluate((element) => element.scrollTop)).toBe(0)
  await brands.focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/brands=.*id/)
})

test('offers retry when scrolling a facet fails', async ({ page }) => {
  await page.goto('/foods?q=chicken')
  await page.waitForLoadState('networkidle')
  await page.route(
    (url) => url.pathname.includes('_server'),
    (route) => route.abort(),
    { times: 1 },
  )
  const brands = page.getByRole('listbox', { name: 'Brands', exact: true })
  await brands.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  const retry = page.getByRole('button', { name: 'Couldn’t load more. Retry', exact: true })
  await expect(retry).toBeVisible()
  await retry.click()
  await expect(brands).toHaveAttribute('data-loaded-count', '60')
})

test('opens a full nutrition page and scales reported nutrients with the portion', async ({
  page,
}) => {
  await page.goto('/foods?q=chicken')
  const link = page.getByRole('link', { name: /Chicken, breast, boneless, skinless, raw/ }).first()
  await link.click()
  await expect(page.getByRole('heading', { name: 'Nutrition Facts', exact: true })).toBeVisible({
    timeout: 15000,
  })
  const facts = page.getByRole('region', { name: 'Nutrition facts' })
  const initial = await facts.innerText()
  await page.getByRole('combobox', { name: 'Nutrition amount' }).selectOption('basis')
  await expect(facts).toContainText('100 g (source basis)')
  expect(await facts.innerText()).not.toBe(initial)
  await expect(page.getByRole('heading', { name: 'Nutrient breakdown', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Nutrition Facts', exact: true })).toBeVisible()
  await page.goto('/food/raw/9223372036854775807')
  await expect(page.getByRole('heading', { name: 'Food not found' })).toBeVisible()
})

test('clears the query and results without losing filters, including after reload', async ({
  page,
}) => {
  await page.goto('/foods?q=burger&kind=branded')
  const food = page.getByRole('textbox', { name: 'Search foods', exact: true })
  await expect(food).toHaveValue('burger')
  await page.waitForLoadState('networkidle')
  await food.fill('')
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('')
  await expect(page.getByRole('grid')).toHaveAttribute('data-loaded-count', '50')
  await expect(page.locator('[data-slot=table-body] [data-slot=table-row]').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Branded', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(food).toBeFocused()
  await page.reload()
  await expect(food).toHaveValue('')
  await expect(page.getByRole('grid')).toHaveAttribute('data-loaded-count', '50')
  await food.fill('chicken')
  await expect(page.getByText('“chicken”', { exact: true })).toBeVisible()
  await expect(page.locator('[data-slot=table-body] [data-slot=table-row]').first()).toBeVisible()
})

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
      .getByRole('option', { name: /^Tyson/ })
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
  await expect(page).toHaveURL(/kinds=.*raw/)
  await expect(page.getByRole('button', { name: 'Raw', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.waitForLoadState('networkidle')
  const rows = page.locator('[data-slot=table-body] [data-slot=table-row]')
  await expect(page.getByRole('grid')).toHaveAttribute('data-loaded-count', '50')
  await expect.poll(() => rows.count()).toBeGreaterThan(0)
  expect(await rows.count()).toBeLessThan(30)
  await expect(rows.first()).toContainText('raw')
  expect(
    await rows.evaluateAll((elements) =>
      elements.every((row) => {
        const cell = row.querySelector('[data-slot=table-cell]')
        const button = cell?.querySelector('a')
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
  const scroll = page.getByRole('grid', { name: 'Food catalog results' })
  await scroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect(scroll).toHaveAttribute('data-loaded-count', '100')
  expect(await rows.count()).toBeLessThan(30)
  const ids = await rows.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-key')),
  )
  expect(ids).not.toEqual(initialIds)
  expect(new Set(ids).size).toBe(ids.length)
  const header = page.locator('[data-slot=table-header]')
  const headerBox = await header.boundingBox()
  const scrollBox = await scroll.boundingBox()
  expect(headerBox).not.toBeNull()
  expect(scrollBox).not.toBeNull()
  expect(Math.abs((headerBox?.y ?? 0) - (scrollBox?.y ?? 0))).toBeLessThan(2)

  await page.getByRole('button', { name: 'All', exact: true }).click()
  await expect(page).toHaveURL(/kinds=%5B%5D/)
  await expect(page.getByRole('button', { name: 'All', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('grid')).toHaveAttribute('data-loaded-count', '50')
  await expect.poll(() => rows.count()).toBeGreaterThan(0)
  expect(await rows.count()).toBeLessThan(30)
  await expect.poll(() => scroll.evaluate((element) => element.scrollTop)).toBe(0)
  const brands = page.getByRole('textbox', { name: 'Search brands', exact: true })
  await brands.fill('tyson')
  await expect(page).toHaveURL(/brandQuery=tyson/)
  const tyson = page
    .locator('aside')
    .getByRole('option', { name: /^Tyson/ })
    .first()
  await tyson.click()
  await expect(page).toHaveURL(/brands=.*id/)
  await expect(rows.first()).toContainText(/by Tyson/i)

  await page.getByRole('button', { name: /^Remove brand:/ }).click()
  const restaurants = page.getByRole('textbox', { name: 'Search restaurants', exact: true })
  await restaurants.fill('applebee')
  await expect(page).toHaveURL(/restaurantQuery=applebee/)
  await page
    .locator('aside')
    .getByRole('option', { name: /Applebee/ })
    .click()
  await expect(page).toHaveURL(/restaurants=.*id/)
  await expect(page).toHaveURL(/brands=%5B%5D/)
  await expect(rows.first()).toContainText(/Applebee/)
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(page).toHaveURL(/kinds=%5B%5D/)
  await food.fill('zzzznomatchingfoodzzzz')
  await expect(page.getByText('No matching foods.', { exact: false })).toBeVisible()
  expect(errors).toEqual([])
})
