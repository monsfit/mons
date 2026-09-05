// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CatalogSearchField } from './CatalogSearchField'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('CatalogSearchField', () => {
  it('cancels pending text and commits an empty food search', () => {
    const commit = vi.fn<(value: string) => void>()
    const view = render(
      <CatalogSearchField primary label="Foods" value="burger" onCommit={commit} />,
    )
    fireEvent.change(view.getByRole('textbox'), { target: { value: 'salmon' } })
    act(() => vi.advanceTimersByTime(200))
    fireEvent.change(view.getByRole('textbox'), { target: { value: '' } })
    act(() => vi.advanceTimersByTime(300))
    expect(commit).toHaveBeenCalledExactlyOnceWith('')
  })
  it('commits only the latest text after 300 ms and flushes immediately on submit', () => {
    const commit = vi.fn<(value: string) => void>()
    const view = render(
      <CatalogSearchField primary label="Foods" value="chicken" onCommit={commit} />,
    )
    const input = view.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'sal' } })
    act(() => vi.advanceTimersByTime(200))
    fireEvent.change(input, { target: { value: 'salmon' } })
    act(() => vi.advanceTimersByTime(299))
    expect(commit).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(commit).toHaveBeenCalledExactlyOnceWith('salmon')
    fireEvent.change(input, { target: { value: 'tuna' } })
    fireEvent.click(view.getByRole('button', { name: 'Search' }))
    expect(commit).toHaveBeenLastCalledWith('tuna')
    act(() => vi.advanceTimersByTime(300))
    expect(commit).toHaveBeenCalledTimes(2)
  })

  it('keeps newer typing when an earlier request finishes and uses the latest filters', () => {
    const first = vi.fn<(value: string) => void>()
    const latest = vi.fn<(value: string) => void>()
    const view = render(<CatalogSearchField label="Brands" value="" onCommit={first} />)
    const input = view.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'ty' } })
    act(() => vi.advanceTimersByTime(300))
    fireEvent.change(input, { target: { value: 'tyson' } })
    view.rerender(<CatalogSearchField label="Brands" value="ty" onCommit={latest} />)
    expect(input.getAttribute('value')).toBe('tyson')
    act(() => vi.advanceTimersByTime(300))
    expect(latest).toHaveBeenCalledExactlyOnceWith('tyson')
    expect(first).toHaveBeenCalledExactlyOnceWith('ty')
  })

  it('cancels pending work on external navigation and unmount', () => {
    const commit = vi.fn<(value: string) => void>()
    const view = render(<CatalogSearchField label="Brands" value="" onCommit={commit} />)
    fireEvent.change(view.getByRole('textbox'), { target: { value: 'tyson' } })
    view.rerender(<CatalogSearchField label="Brands" value="annies" onCommit={commit} />)
    act(() => vi.advanceTimersByTime(300))
    expect(commit).not.toHaveBeenCalled()
    fireEvent.change(view.getByRole('textbox'), { target: { value: 'kellogg' } })
    view.unmount()
    act(() => vi.advanceTimersByTime(300))
    expect(commit).not.toHaveBeenCalled()
  })

  it('does not roll back a second submitted query when the first one finishes', () => {
    const commit = vi.fn<(value: string) => void>()
    const view = render(<CatalogSearchField label="Brands" value="" onCommit={commit} />)
    const input = view.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'ty' } })
    act(() => vi.advanceTimersByTime(300))
    fireEvent.change(input, { target: { value: 'tyson' } })
    act(() => vi.advanceTimersByTime(300))
    view.rerender(<CatalogSearchField label="Brands" value="ty" onCommit={commit} />)
    expect(input.getAttribute('value')).toBe('tyson')
    view.rerender(<CatalogSearchField label="Brands" value="tyson" onCommit={commit} />)
    expect(input.getAttribute('value')).toBe('tyson')
    expect(commit).toHaveBeenCalledTimes(2)
  })

  it('waits for composition and ignores too-short food queries but allows clearing facets', () => {
    const commit = vi.fn<(value: string) => void>()
    const view = render(
      <CatalogSearchField primary label="Foods" value="chicken" onCommit={commit} />,
    )
    const input = view.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'c' } })
    act(() => vi.advanceTimersByTime(300))
    expect(commit).not.toHaveBeenCalled()
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'salmon' } })
    act(() => vi.advanceTimersByTime(300))
    expect(commit).not.toHaveBeenCalled()
    fireEvent.compositionEnd(input)
    act(() => vi.advanceTimersByTime(300))
    expect(commit).toHaveBeenCalledExactlyOnceWith('salmon')
    view.rerender(<CatalogSearchField label="Brands" value="tyson" onCommit={commit} />)
    fireEvent.change(input, { target: { value: '' } })
    act(() => vi.advanceTimersByTime(300))
    expect(commit).toHaveBeenLastCalledWith('')
  })
})
