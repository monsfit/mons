import { useEffect, useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  CircleDot,
  Database,
  Layers3,
  RefreshCw,
  Search,
  Shapes,
  Sparkles,
  Tag,
  type LucideIcon,
} from 'lucide-react'

import type { CatalogSearch } from '~/features/catalog/catalog-search'
import { formatCompactCount, formatNutrient } from '~/features/catalog/catalog-search'
import type { getCatalogWorkspace } from '~/features/catalog/catalog-functions'
import { FoodDetailsSheet } from '~/components/FoodDetailsSheet'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'

type Workspace = Awaited<ReturnType<typeof getCatalogWorkspace>>

interface FoodExplorerPageProps {
  readonly search: CatalogSearch
  readonly workspace: Workspace
  readonly updateSearch: (next: CatalogSearch) => void
}

const datasetLabels = {
  all: 'All sources',
  branded: 'Branded',
  raw: 'Raw',
  restaurant: 'Restaurants',
} as const

export function FoodExplorerPage({ search, updateSearch, workspace }: FoodExplorerPageProps) {
  const [query, setQuery] = useState(search.q)
  const [brandQuery, setBrandQuery] = useState(search.brandQuery)
  const totalFoods = workspace.foodGroups.reduce((sum, group) => sum + group.foodCount, 0)
  const activeGroup = workspace.foodGroups.find((group) => group.id === search.foodGroupId)
  const catalogStats: ReadonlyArray<{
    readonly icon: LucideIcon
    readonly label: string
    readonly value: string
  }> = [
    { icon: Database, label: 'foods', value: formatCompactCount(totalFoods) },
    { icon: Layers3, label: 'groups', value: String(workspace.foodGroups.length) },
    { icon: RefreshCw, label: 'release', value: workspace.releaseId.slice(0, 10) },
  ]

  useEffect(() => setQuery(search.q), [search.q])
  useEffect(() => setBrandQuery(search.brandQuery), [search.brandQuery])

  const submitFoodSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextQuery = query.trim()
    if (nextQuery.length >= 2) updateSearch({ ...search, q: nextQuery })
  }

  const submitBrandSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateSearch({ ...search, brandQuery: brandQuery.trim() })
  }

  return (
    <div className="dark min-h-screen bg-[#100e11] font-sans text-foreground">
      <header className="sticky top-0 z-40 flex h-16 items-center border-b border-white/8 bg-[#100e11]/92 px-4 backdrop-blur-xl md:px-6">
        <Link to="/" className="flex items-center gap-3" aria-label="Mons home">
          <span className="text-lg font-semibold tracking-[0.16em] text-white">MONS</span>
          <span className="h-5 w-px bg-white/15" />
          <span className="text-sm text-white/45">Data workspace</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <Badge variant="outline" className="hidden border-white/10 text-white/55 sm:inline-flex">
            {workspace.stage}
          </Badge>
          <span className="flex items-center gap-2 text-xs text-white/45">
            <span className="size-1.5 rounded-full bg-[#b9f35b] shadow-[0_0_12px_#b9f35b]" />
            PostgreSQL live
          </span>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="border-b border-white/8 bg-[#131115] px-4 py-5 lg:border-r lg:border-b-0 lg:px-5">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-white/35 uppercase">
                Catalog
              </p>
              <p className="mt-1 text-sm text-white/70">Food explorer</p>
            </div>
            <div className="grid size-9 place-items-center rounded-xl border border-white/8 bg-white/4 text-[#b9f35b]">
              <Shapes className="size-4" />
            </div>
          </div>

          <section className="mb-7">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-medium text-white/55">Food groups</h2>
              <span className="text-[0.68rem] text-white/30">{workspace.foodGroups.length}</span>
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto pr-1 lg:max-h-[36vh]">
              <button
                type="button"
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${search.foodGroupId === 'all' ? 'bg-white/9 text-white' : 'text-white/48 hover:bg-white/5 hover:text-white/75'}`}
                onClick={() => updateSearch({ ...search, foodGroupId: 'all' })}
              >
                <span>All groups</span>
                <span className="font-mono text-[0.65rem]">{formatCompactCount(totalFoods)}</span>
              </button>
              {workspace.foodGroups.map((group) => (
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${search.foodGroupId === group.id ? 'bg-[#b9f35b] text-[#15200a]' : 'text-white/48 hover:bg-white/5 hover:text-white/75'}`}
                  key={group.id}
                  onClick={() => updateSearch({ ...search, foodGroupId: group.id })}
                >
                  <span className="truncate">{group.name}</span>
                  <span className="ml-2 font-mono text-[0.65rem] opacity-65">
                    {formatCompactCount(group.foodCount)}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="border-t border-white/8 pt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-medium text-white/55">Brands</h2>
              {search.brandId !== 'all' && (
                <button
                  className="text-[0.68rem] text-[#b9f35b]"
                  type="button"
                  onClick={() => updateSearch({ ...search, brandId: 'all', brandName: '' })}
                >
                  Clear
                </button>
              )}
            </div>
            <form className="relative mb-3" onSubmit={submitBrandSearch}>
              <Search className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-white/30" />
              <Input
                aria-label="Search brands"
                className="border-white/8 bg-white/3 pl-8 text-xs text-white placeholder:text-white/25"
                placeholder="Search brands"
                value={brandQuery}
                onChange={(event) => setBrandQuery(event.target.value)}
              />
            </form>
            {search.brandId !== 'all' && (
              <div className="mb-2 rounded-lg bg-[#b9f35b]/10 px-2.5 py-2 text-xs text-[#d5ff92]">
                {search.brandName}
              </div>
            )}
            <div className="space-y-1">
              {workspace.brands.slice(0, 8).map((brand) => (
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-white/45 transition hover:bg-white/5 hover:text-white/75"
                  key={brand.id}
                  onClick={() =>
                    updateSearch({ ...search, brandId: brand.id, brandName: brand.name })
                  }
                >
                  <span className="truncate">{brand.name}</span>
                  <span className="ml-2 font-mono text-[0.65rem] text-white/25">
                    {formatCompactCount(brand.foodCount)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <main className="min-w-0 bg-[#100e11] p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-[96rem]">
            <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs text-[#b9f35b]">
                  <Sparkles className="size-3.5" /> Normalized nutrition catalog
                </div>
                <h1 className="text-3xl font-medium tracking-[-0.035em] text-white md:text-4xl">
                  Know what’s in the data.
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/42">
                  Search every raw, branded, and restaurant food from one normalized table.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:min-w-[28rem]">
                {catalogStats.map(({ icon: Icon, label, value }) => (
                  <div
                    className="rounded-xl border border-white/8 bg-white/3 px-3 py-3"
                    key={label}
                  >
                    <div className="mb-3 flex items-center justify-between text-white/30">
                      <Icon className="size-3.5" />
                      <span className="text-[0.62rem] uppercase">{label}</span>
                    </div>
                    <strong className="block truncate text-sm font-medium text-white">
                      {value}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#171419] shadow-2xl shadow-black/25">
              <div className="flex flex-col gap-3 border-b border-white/8 p-3 md:flex-row md:items-center">
                <form className="relative flex-1" onSubmit={submitFoodSearch}>
                  <Search className="pointer-events-none absolute top-3 left-3 size-4 text-white/30" />
                  <Input
                    aria-label="Search foods"
                    className="h-10 border-white/10 bg-[#100e11] pr-24 pl-10 text-white placeholder:text-white/25"
                    minLength={2}
                    placeholder="Search foods, brands, and restaurants"
                    required
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <Button
                    type="submit"
                    className="absolute top-1 right-1 h-8 bg-[#b9f35b] px-3 text-[#17200d] hover:bg-[#cafc79]"
                  >
                    Search <ArrowRight className="size-3.5" />
                  </Button>
                </form>
                <Select
                  aria-label="Dataset type"
                  selectedKey={search.kind}
                  onSelectionChange={(key) =>
                    updateSearch({
                      ...search,
                      kind:
                        key === 'raw' || key === 'branded' || key === 'restaurant' ? key : 'all',
                    })
                  }
                >
                  <SelectTrigger className="h-10 min-w-40 border-white/10 bg-white/3 text-white">
                    <SelectValue>{({ selectedText }) => selectedText}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="dark border-white/10 bg-[#211d22] text-white">
                    {Object.entries(datasetLabels).map(([id, label]) => (
                      <SelectItem id={id} key={id}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-b border-white/8 px-4 py-3 text-xs text-white/40">
                <span>{workspace.foods.length} results</span>
                <span className="text-white/15">/</span>
                <span>“{search.q}”</span>
                {activeGroup !== undefined && (
                  <Badge variant="outline" className="border-white/10 text-white/55">
                    <Shapes className="size-3" /> {activeGroup.name}
                  </Badge>
                )}
                {search.brandId !== 'all' && (
                  <Badge variant="outline" className="border-white/10 text-white/55">
                    <Tag className="size-3" /> {search.brandName}
                  </Badge>
                )}
              </div>

              <Table aria-label="Food catalog results" className="table-fixed min-w-[62rem]">
                <TableHeader className="bg-white/2">
                  <TableHead isRowHeader className="w-[32%] px-4 text-xs text-white/38">
                    Food
                  </TableHead>
                  <TableHead className="text-xs text-white/38">Group</TableHead>
                  <TableHead className="text-right text-xs text-white/38">Energy</TableHead>
                  <TableHead className="text-right text-xs text-white/38">Protein</TableHead>
                  <TableHead className="text-right text-xs text-white/38">Fat</TableHead>
                  <TableHead className="pr-4 text-right text-xs text-white/38">Carbs</TableHead>
                </TableHeader>
                <TableBody items={workspace.foods}>
                  {(food) => (
                    <TableRow id={`${food.datasetKind}:${food.foodId}`} className="border-white/7">
                      <TableCell className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/6 bg-white/5 text-white/35">
                            <CircleDot className="size-3.5" />
                          </div>
                          <FoodDetailsSheet food={food} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="border-white/8 text-white/55">
                            {food.foodGroup}
                          </Badge>
                          {food.foodSubgroup === null ? null : (
                            <span className="text-[0.68rem] text-white/32">
                              {food.foodSubgroup}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-white/75">
                        {formatNutrient(food.calories, 'kcal')}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-white/75">
                        {formatNutrient(food.protein)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-white/75">
                        {formatNutrient(food.totalFat)}
                      </TableCell>
                      <TableCell className="pr-4 text-right font-mono text-xs text-white/75">
                        {formatNutrient(food.carbohydrates)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {workspace.foods.length === 0 && (
                <div className="grid min-h-64 place-items-center p-8 text-center">
                  <div>
                    <Search className="mx-auto mb-3 size-5 text-white/25" />
                    <p className="text-sm text-white/60">No matching foods</p>
                    <p className="mt-1 text-xs text-white/30">
                      Try a broader term or clear a filter.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
