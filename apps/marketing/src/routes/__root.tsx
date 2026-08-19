import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    links: [
      { href: appCss, rel: 'stylesheet' },
      { href: '/favicon.svg', rel: 'icon', type: 'image/svg+xml' },
      { href: '/site.webmanifest', rel: 'manifest' },
    ],
    meta: [
      { charSet: 'utf-8' },
      { content: 'width=device-width, initial-scale=1', name: 'viewport' },
      { content: '#120f13', name: 'theme-color' },
      {
        content:
          'Mons brings food, strength training, and weight progress into one focused daily practice.',
        name: 'description',
      },
      { content: 'Mons — Nutrition and training, in rhythm', property: 'og:title' },
      {
        content: 'Track nutrition, build workouts, and understand progress without the noise.',
        property: 'og:description',
      },
      { content: 'website', property: 'og:type' },
      { content: 'summary_large_image', name: 'twitter:card' },
      { title: 'Mons — Nutrition and training, in rhythm' },
    ],
  }),
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
