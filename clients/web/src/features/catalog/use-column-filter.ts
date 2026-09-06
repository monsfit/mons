import { useEffect, useRef, useState } from 'react'

export function useColumnFilter() {
  const [column, setColumn] = useState<string | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pinned = useRef(false)
  const cancel = () => clearTimeout(timer.current)

  useEffect(() => () => clearTimeout(timer.current), [])

  const focusDialog = () => {
    const dialog = popoverRef.current?.querySelector('[role="dialog"]')
    if (dialog instanceof HTMLElement) dialog.focus()
  }
  useEffect(() => {
    if (column && pinned.current) focusDialog()
  }, [column])

  const close = () => {
    cancel()
    pinned.current = false
    setColumn(null)
  }
  const open = (id: string, target: HTMLElement) => {
    cancel()
    pinned.current = true
    triggerRef.current = target
    setColumn(id)
    if (column === id) focusDialog()
  }
  const hover = (id: string, target: HTMLElement) => {
    cancel()
    if (pinned.current || popoverRef.current?.contains(document.activeElement)) return
    timer.current = setTimeout(() => {
      if (!target.isConnected) return
      triggerRef.current = target
      setColumn(id)
    }, 180)
  }
  const leave = () => {
    cancel()
    if (pinned.current) return
    timer.current = setTimeout(() => {
      if (popoverRef.current?.contains(document.activeElement)) return
      setColumn(null)
    }, 300)
  }

  return { column, triggerRef, popoverRef, open, close, hover, leave, cancel }
}
