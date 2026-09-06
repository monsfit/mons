import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Search } from 'lucide-react'

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from './ui/input-group'

export const SEARCH_DEBOUNCE_MS = 300

interface CatalogSearchFieldProps {
  readonly label: string
  readonly value: string
  readonly onCommit: (value: string) => void
  readonly primary?: boolean
}

export function CatalogSearchField({
  label,
  value,
  onCommit,
  primary = false,
}: CatalogSearchFieldProps) {
  const [draft, setDraft] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const submitted = useRef(value)
  const pending = useRef<string[]>([])
  const composing = useRef(false)
  const commitLatest = useEffectEvent((text: string) => onCommit(text))

  function cancel() {
    clearTimeout(timer.current)
    timer.current = undefined
  }

  function commit(text: string) {
    cancel()
    const normalized = text.trim()
    if (
      composing.current ||
      (primary && normalized.length === 1) ||
      normalized === submitted.current
    )
      return
    submitted.current = normalized
    pending.current.push(normalized)
    onCommit(normalized)
  }

  function schedule(text: string) {
    cancel()
    const normalized = text.trim()
    if (
      composing.current ||
      (primary && normalized.length === 1) ||
      normalized === submitted.current
    )
      return
    timer.current = setTimeout(() => {
      timer.current = undefined
      submitted.current = normalized
      pending.current.push(normalized)
      commitLatest(normalized)
    }, SEARCH_DEBOUNCE_MS)
  }

  useEffect(() => {
    // Acknowledging an earlier request must not erase newer typing.
    const acknowledged = pending.current.indexOf(value)
    if (acknowledged !== -1) {
      pending.current.splice(0, acknowledged + 1)
      return
    }
    if (value === submitted.current) return
    cancel()
    pending.current = []
    submitted.current = value
    setDraft(value)
  }, [value])
  useEffect(() => cancel, [])

  return (
    <form
      className={primary ? 'relative flex-1' : 'relative'}
      onSubmit={(event) => {
        event.preventDefault()
        commit(draft)
      }}
    >
      <InputGroup className={primary ? 'h-10' : ''}>
        <InputGroupInput
          aria-label={label}
          aria-describedby={primary && draft.trim().length === 1 ? 'food-search-hint' : undefined}
          maxLength={primary ? 200 : 160}
          placeholder={primary ? 'Search foods, brands, and restaurants' : label}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            schedule(event.target.value)
          }}
          onCompositionStart={() => {
            composing.current = true
            cancel()
          }}
          onCompositionEnd={(event) => {
            composing.current = false
            schedule(event.currentTarget.value)
          }}
        />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        {primary && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton type="submit">Search</InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
      {primary && draft.trim().length === 1 && (
        <p id="food-search-hint" role="status" className="mt-2 text-xs text-muted-foreground">
          Type at least 2 characters to search.
        </p>
      )}
    </form>
  )
}
