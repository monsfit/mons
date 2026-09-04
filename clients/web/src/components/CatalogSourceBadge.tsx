import { CircleCheck } from 'lucide-react'

import { getCatalogSource } from '~/features/catalog/catalog-sources'

export function CatalogSourceBadge({ source }: Readonly<{ source: string }>) {
  const metadata = getCatalogSource(source)

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="truncate text-xs text-white/55">{metadata.label}</span>
      {metadata.verified ? (
        <span title="Verified scientific source" aria-label="Verified scientific source">
          <CircleCheck className="size-3.5 shrink-0 text-[#b9f35b]" />
        </span>
      ) : null}
    </div>
  )
}
