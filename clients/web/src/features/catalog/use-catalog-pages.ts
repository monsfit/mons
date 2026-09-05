import { useCallback, useEffect, useRef, useState } from 'react'

import { getCatalogFoodPage, type getCatalogWorkspace } from './catalog-functions'
import { toCatalogQuery, type CatalogSearch } from './catalog-search'

export function useCatalogPages(
  search: CatalogSearch,
  workspace: Awaited<ReturnType<typeof getCatalogWorkspace>>,
  isPending: boolean,
) {
  const [page, setPage] = useState({ foods: workspace.foods, nextOffset: workspace.nextOffset })
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const generation = useRef(0)
  const blocked = useRef(false)
  const resultsScrollRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const invalidate = useCallback(() => {
    generation.current += 1
    blocked.current = true
  }, [])

  useEffect(() => {
    generation.current += 1
    blocked.current = isPending
    setPage({ foods: workspace.foods, nextOffset: workspace.nextOffset })
    setStatus('idle')
    resultsScrollRef.current?.scrollTo({ top: 0 })
    return invalidate
  }, [search, workspace, isPending, invalidate])

  const loadMore = useCallback(async () => {
    if (page.nextOffset === null || blocked.current) return
    const requestGeneration = generation.current
    blocked.current = true
    setStatus('loading')
    try {
      const next = await getCatalogFoodPage({
        data: { ...toCatalogQuery(search), offset: page.nextOffset },
      })
      if (requestGeneration !== generation.current) return
      setPage((current) => {
        const ids = new Set(current.foods.map((food) => food.foodId))
        return {
          foods: [...current.foods, ...next.foods.filter((food) => !ids.has(food.foodId))],
          nextOffset: next.nextOffset,
        }
      })
      setStatus('idle')
    } catch {
      if (requestGeneration === generation.current) setStatus('error')
    } finally {
      if (requestGeneration === generation.current) blocked.current = false
    }
  }, [page.nextOffset, search])

  useEffect(() => {
    const root = resultsScrollRef.current
    const target = loadMoreRef.current
    if (root === null || target === null || page.nextOffset === null || status === 'error') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { root, rootMargin: '240px 0px' },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [loadMore, page.nextOffset, status])

  return { ...page, status, loadMore, invalidate, resultsScrollRef, loadMoreRef }
}
