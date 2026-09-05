// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { getCatalogFoodPage, type getCatalogWorkspace } from './catalog-functions'
import { parseCatalogSearch, toCatalogQuery } from './catalog-search'
import { useCatalogPages } from './use-catalog-pages'

vi.mock('./catalog-functions', () => ({ getCatalogFoodPage: vi.fn<typeof getCatalogFoodPage>() }))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const workspace: Awaited<ReturnType<typeof getCatalogWorkspace>> = {
  brands: [],
  brandNextOffset: null,
  restaurantNextOffset: null,
  foods: [],
  foodGroups: [],
  restaurants: [],
  nextOffset: 50,
  releaseId: 'test',
  stage: 'local',
}

it('ignores old pages after navigation and resets even when results are structurally identical', async () => {
  const first = Promise.withResolvers<Awaited<ReturnType<typeof getCatalogFoodPage>>>()
  vi.mocked(getCatalogFoodPage)
    .mockReturnValueOnce(first.promise)
    .mockResolvedValue({ foods: [], nextOffset: null })
  const search = parseCatalogSearch({ q: 'chicken' })
  const view = renderHook(
    ({ search: currentSearch, pending }) => useCatalogPages(currentSearch, workspace, pending),
    {
      initialProps: { search, pending: false },
    },
  )
  let request: Promise<void> = Promise.resolve()
  act(() => {
    request = view.result.current.loadMore()
  })
  await act(() => view.result.current.loadMore())
  expect(getCatalogFoodPage).toHaveBeenCalledTimes(1)
  act(() => view.result.current.invalidate())
  view.rerender({ search, pending: true })
  await act(async () => {
    first.resolve({ foods: [], nextOffset: 999 })
    await request
  })
  expect(view.result.current.nextOffset).toBe(50)
  const nextSearch = parseCatalogSearch({ q: 'chicken', kind: 'raw' })
  view.rerender({ search: nextSearch, pending: false })
  await act(() => view.result.current.loadMore())
  expect(getCatalogFoodPage).toHaveBeenLastCalledWith({
    data: { ...toCatalogQuery(nextSearch), offset: 50 },
  })
  expect(view.result.current.nextOffset).toBeNull()
})

it('offers retry after failure and blocks requests after unmount', async () => {
  vi.mocked(getCatalogFoodPage)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ foods: [], nextOffset: null })
  const search = parseCatalogSearch({ q: 'chicken' })
  const view = renderHook(() => useCatalogPages(search, workspace, false))
  await act(() => view.result.current.loadMore())
  expect(view.result.current.status).toBe('error')
  await act(() => view.result.current.loadMore())
  expect(view.result.current.status).toBe('idle')
  const loadMore = view.result.current.loadMore
  view.unmount()
  await loadMore()
  expect(getCatalogFoodPage).toHaveBeenCalledTimes(2)
})
