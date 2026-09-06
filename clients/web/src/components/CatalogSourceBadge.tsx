import { CircleHelp } from 'lucide-react'
import { Dialog } from 'react-aria-components'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
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
      <Badge variant="subtle" className="rounded-md">
        {short}
      </Badge>
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
