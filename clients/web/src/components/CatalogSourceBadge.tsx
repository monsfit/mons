import { CircleCheck } from 'lucide-react'
import { Badge } from './ui/badge'

import { getCatalogSource } from '~/features/catalog/catalog-sources'

export function CatalogSourceBadge({ source }: Readonly<{ source: string }>) {
  const metadata = getCatalogSource(source)

  return (
    <Badge
      variant="outline"
      title={metadata.label}
      className="h-auto min-h-6 max-w-full shrink rounded-md border-transparent bg-info/10 px-2 py-1 text-info whitespace-normal justify-start"
    >
      <span className="text-[11px] leading-4">{metadata.label}</span>
      {metadata.verified ? (
        <span title="Verified scientific source" aria-label="Verified scientific source">
          <CircleCheck className="size-3.5 shrink-0 text-success" />
        </span>
      ) : null}
    </Badge>
  )
}
