// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CatalogTags } from './CatalogTags'

afterEach(cleanup)

it('shows three unique tags and reveals the complete list', async () => {
  const { container } = render(
    <CatalogTags tags={['Fruit', 'Citrus', 'Fresh', 'Seasonal', 'Fruit', null]} />,
  )
  expect(container.querySelectorAll('[data-slot="badge"]')).toHaveLength(3)
  expect(screen.queryByText('Seasonal')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'View all 4 tags' }))
  expect(await screen.findByRole('dialog', { name: 'All food tags' })).toBeTruthy()
  expect(screen.getByText('Seasonal')).toBeTruthy()
})

it('does not show overflow for three or fewer tags', () => {
  render(<CatalogTags tags={['Fruit', null, 'Citrus']} />)
  expect(screen.queryByRole('button')).toBeNull()
})
