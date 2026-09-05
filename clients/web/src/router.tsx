import { createRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

const parseValue = (key: string, value: string): unknown => {
  if (
    !['brands', 'groups', 'restaurants', 'kinds', 'sources', 'subgroups'].includes(key) ||
    !value.startsWith('[')
  )
    return value
  try {
    const decoded: unknown = JSON.parse(value)
    return Array.isArray(decoded) ? decoded : value
  } catch {
    return value
  }
}

const parseSearch = (searchString: string): Record<string, unknown> =>
  Object.fromEntries(
    [
      ...new URLSearchParams(searchString.startsWith('?') ? searchString.slice(1) : searchString),
    ].map(([key, value]) => [key, parseValue(key, value)]),
  )

const stringifySearch = (search: Record<string, unknown>): string => {
  const parameters = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (typeof value === 'string') parameters.set(key, value)
    else if (Array.isArray(value)) parameters.set(key, JSON.stringify(value))
  }
  const encoded = parameters.toString()
  return encoded.length === 0 ? '' : `?${encoded}`
}

export function getRouter() {
  return createRouter({
    defaultPreload: 'intent',
    parseSearch,
    routeTree,
    scrollRestoration: true,
    stringifySearch,
  })
}
