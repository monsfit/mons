import type { CatalogFood } from '~/features/catalog/catalog-functions'
import { formatNutrient } from '~/features/catalog/catalog-search'
import { Badge } from '~/components/ui/badge'
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet'
import { Button } from '~/components/ui/button'
import { ArrowUpRight, Barcode, Database, Layers3 } from 'lucide-react'

function basisLabel(food: CatalogFood) {
  const amount = food.nutrientBasis.amount.toLocaleString('en-US', { maximumFractionDigits: 1 })
  return `${amount} ${food.nutrientBasis.unit}`
}

export function FoodDetailsSheet({ food }: Readonly<{ food: CatalogFood }>) {
  const portion = food.defaultPortion

  return (
    <SheetTrigger>
      <Button
        variant="ghost"
        className="h-auto w-full min-w-0 justify-start overflow-hidden px-0 py-1 text-left hover:bg-transparent"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{food.name}</span>
          <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">
            {food.brand ?? food.foodGroup}
          </span>
        </span>
      </Button>
      <SheetContent className="w-[min(92vw,30rem)] border-white/10 bg-[#171419] text-white sm:max-w-[30rem]">
        <SheetHeader className="border-b border-white/8 px-6 py-6">
          <div className="mb-4 flex items-center gap-2">
            <Badge className="bg-[#b9f35b] text-[#16200c]">{food.foodGroup}</Badge>
            <Badge variant="outline" className="border-white/15 text-white/65">
              {food.datasetKind}
            </Badge>
          </div>
          <SheetTitle className="font-sans text-2xl leading-tight text-white">
            {food.name}
          </SheetTitle>
          <SheetDescription className="mt-2 text-white/55">
            {food.brand === null ? 'Unbranded catalog food' : `by ${food.brand}`}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-7 overflow-y-auto px-6 py-6">
          <section>
            <p className="mb-3 text-[0.68rem] font-semibold tracking-[0.16em] text-white/40 uppercase">
              Nutrition per {basisLabel(food)}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Energy', formatNutrient(food.calories, 'kcal')],
                ['Protein', formatNutrient(food.protein)],
                ['Total fat', formatNutrient(food.totalFat)],
                ['Carbohydrate', formatNutrient(food.carbohydrates)],
              ].map(([label, value]) => (
                <div className="rounded-xl border border-white/8 bg-white/4 p-4" key={label}>
                  <span className="text-xs text-white/45">{label}</span>
                  <strong className="mt-2 block text-lg font-medium">{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3 text-sm">
            <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-white/40 uppercase">
              Catalog record
            </p>
            <div className="flex items-center justify-between border-b border-white/8 py-3">
              <span className="flex items-center gap-2 text-white/50">
                <Database className="size-4" /> Food ID
              </span>
              <span className="font-mono text-xs text-white/80">{food.foodId}</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/8 py-3">
              <span className="flex items-center gap-2 text-white/50">
                <Layers3 className="size-4" /> Basis
              </span>
              <span>{basisLabel(food)}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="flex items-center gap-2 text-white/50">
                <Barcode className="size-4" /> Default portion
              </span>
              <span>{portion === null ? 'Not provided' : portion.name}</span>
            </div>
          </section>

          <div className="rounded-xl border border-[#b9f35b]/15 bg-[#b9f35b]/6 p-4 text-sm leading-6 text-white/60">
            This is a read-only view of the normalized catalog record. Editing and review workflows
            will land here next.
          </div>

          <Button
            variant="outline"
            className="w-full border-white/12 bg-white/5 text-white"
            isDisabled
          >
            Open review workflow <ArrowUpRight />
          </Button>
        </div>
      </SheetContent>
    </SheetTrigger>
  )
}
