import { CircleCheck, CircleHelp } from 'lucide-react'
import { Dialog } from 'react-aria-components'
import { Button } from './ui/button'
import { Popover, PopoverTitle, PopoverTrigger } from './ui/popover'

import { getCatalogSource } from '~/features/catalog/catalog-sources'

export function CatalogSourceBadge({ source }: Readonly<{ source: string }>) {
  const metadata = getCatalogSource(source)
  const short = metadata.abbreviation ?? metadata.label

  return (
    <span
      title={metadata.label}
      className="inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground"
    >
      <span>{short}</span>
      {metadata.verified ? (
        <span title="Verified scientific source" aria-label="Verified scientific source">
          <CircleCheck className="size-3.5 shrink-0 text-success" />
        </span>
      ) : null}
      <PopoverTrigger>
        <Button variant="ghost" size="icon-xs" aria-label={`About ${short}`}>
          <CircleHelp />
        </Button>
        <Popover>
          <Dialog
            aria-label={`${short} source details`}
            className="flex flex-col gap-2 whitespace-normal outline-none"
          >
            <PopoverTitle>{short}</PopoverTitle>
            <p>{metadata.fullName ?? metadata.label}</p>
            {metadata.verified && (
              <p className="text-xs text-muted-foreground">Verified scientific source</p>
            )}
          </Dialog>
        </Popover>
      </PopoverTrigger>
    </span>
  )
}
