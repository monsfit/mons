import { CircleCheck } from 'lucide-react'

import { getCatalogSource } from '~/features/catalog/catalog-sources'

export function CatalogSourceBadge({ source }: Readonly<{ source: string }>) {
  const metadata = getCatalogSource(source)

  return (
    <span
      title={metadata.label}
      className="inline-flex max-w-full items-start gap-2 text-xs leading-5 whitespace-normal text-muted-foreground"
    >
      <span>{metadata.label}</span>
      {metadata.verified ? (
        <span title="Verified scientific source" aria-label="Verified scientific source">
          <CircleCheck className="mt-1 size-3.5 shrink-0 text-success" />
        </span>
      ) : null}
    </span>
  )
}
