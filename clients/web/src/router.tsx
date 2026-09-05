import { createRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

const parseSearch = (searchString: string): Record<string, string> =>
  Object.fromEntries(
    new URLSearchParams(searchString.startsWith('?') ? searchString.slice(1) : searchString),
  )

const stringifySearch = (search: Record<string, unknown>): string => {
  const parameters = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (typeof value === 'string') parameters.set(key, value)
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
