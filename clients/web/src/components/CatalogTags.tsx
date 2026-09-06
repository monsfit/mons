import { Ellipsis } from 'lucide-react'
import { Dialog } from 'react-aria-components'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Popover, PopoverTitle, PopoverTrigger } from './ui/popover'

export function CatalogTags({ tags }: Readonly<{ tags: ReadonlyArray<string | null> }>) {
  const unique = [
    ...new Set(tags.filter((tag): tag is string => tag !== null && tag.trim() !== '')),
  ]
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1" aria-label="Food tags">
      {unique.slice(0, 3).map((tag) => (
        <Badge
          key={tag}
          variant="outline"
          title={tag}
          className="col-start-1 max-w-full rounded-md"
        >
          <span className="truncate">{tag}</span>
        </Badge>
      ))}
      {unique.length > 3 && (
        <PopoverTrigger>
          <Button
            className="col-start-2 row-start-3"
            size="icon-xs"
            variant="outline"
            aria-label={`View all ${unique.length} tags`}
          >
            <Ellipsis />
          </Button>
          <Popover className="max-h-80 overflow-y-auto">
            <Dialog aria-label="All food tags" className="flex flex-col gap-3 outline-none">
              <PopoverTitle>All tags ({unique.length})</PopoverTitle>
              <ul className="flex flex-col gap-2">
                {unique.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </Dialog>
          </Popover>
        </PopoverTrigger>
      )}
    </div>
  )
}
