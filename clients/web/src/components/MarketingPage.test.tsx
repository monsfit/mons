import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { productPillars } from '../content'
import { MarketingPage } from './MarketingPage'

describe('MarketingPage', () => {
  it('renders the primary message and accessible navigation', () => {
    const markup = renderToStaticMarkup(<MarketingPage />)

    expect(markup).toContain('Nutrition and training,')
    expect(markup).toContain('aria-label="Primary navigation"')
    expect(markup).toContain('Request early access')
  })

  it('keeps product pillars unique and deterministic', () => {
    const identifiers = productPillars.map((pillar) => pillar.id)

    expect(new Set(identifiers).size).toBe(productPillars.length)
    expect(identifiers).toEqual(['nutrition', 'training', 'progress'])
  })
})
