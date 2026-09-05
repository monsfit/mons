import { CircleCheck } from 'lucide-react'

import { getCatalogSource } from '~/features/catalog/catalog-sources'

export function CatalogSourceBadge({ source }: Readonly<{ source: string }>) {
  const metadata = getCatalogSource(source)

  return (
    <span
      title={metadata.label}
      className="inline-flex w-fit max-w-full min-w-0 items-center gap-1.5 rounded-full border border-sky-300/20 bg-sky-300/5 px-2 py-1 text-sky-100/80"
    >
      <span className="truncate text-[10px]">{metadata.label}</span>
      {metadata.verified ? (
        <span title="Verified scientific source" aria-label="Verified scientific source">
          <CircleCheck className="size-3.5 shrink-0 text-[#b9f35b]" />
        </span>
      ) : null}
    </span>
  )
}
