import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { FoodRecord } from '@mons/database'
import { ArrowLeft, Flame } from 'lucide-react'
import { CatalogSourceBadge } from './CatalogSourceBadge'
import {
  DAILY_VALUE_SOURCE,
  dailyValuePercent,
  nutrientGroup,
  nutritionPortions,
} from '~/features/catalog/nutrition'
import { parseCatalogSearch } from '~/features/catalog/catalog-search'
import { formatNutritionAmount as formatNutrient } from '~/features/catalog/nutrition'

type NutrientLabel = readonly [field: string, label: string, unit: string]
const macros: ReadonlyArray<NutrientLabel> = [
  ['calories', 'Calories', 'kcal'],
  ['protein', 'Protein', 'g'],
  ['carbohydrates_total', 'Carbs', 'g'],
  ['total_fat', 'Fat', 'g'],
]
const groupOrder = [
  'Carbohydrates',
  'Fats',
  'Protein',
  'Amino acids',
  'Vitamins & choline',
  'Minerals',
  'Other nutrients',
]
const facts: ReadonlyArray<NutrientLabel> = [
  ['total_fat', 'Total fat', 'g'],
  ['saturated_fat', 'Saturated fat', 'g'],
  ['trans_fat', 'Trans fat', 'g'],
  ['dietary_cholesterol', 'Cholesterol', 'mg'],
  ['sodium', 'Sodium', 'mg'],
  ['carbohydrates_total', 'Total carbohydrate', 'g'],
  ['fiber', 'Dietary fiber', 'g'],
  ['total_sugars', 'Total sugars', 'g'],
  ['added_sugars', 'Added sugars', 'g'],
  ['protein', 'Protein', 'g'],
  ['vitamin_d_calciferol', 'Vitamin D', 'mcg'],
  ['calcium', 'Calcium', 'mg'],
  ['iron', 'Iron', 'mg'],
  ['potassium', 'Potassium', 'mg'],
]

export function FoodNutritionPage({ food }: Readonly<{ food: FoodRecord }>) {
  const portions = nutritionPortions(food)
  const [portionId, setPortionId] = useState(portions[1]?.id ?? 'basis')
  const portion = portions.find((item) => item.id === portionId) ?? portions[0]
  const scale = portion?.scale ?? 1
  const nutrients = food.nutrients.map((nutrient) => ({
    ...nutrient,
    amount: nutrient.amount * scale,
  }))
  const amount = (field: string) =>
    nutrients.find((nutrient) => nutrient.field === field)?.amount ?? null
  const grouped = Map.groupBy(
    nutrients.filter((nutrient) => nutrient.field !== 'calories'),
    (nutrient) => nutrientGroup(nutrient.field),
  )

  return (
    <div className="dark min-h-screen bg-[#111] text-white">
      <header className="catalog-header">
        <Link to="/" className="font-bold tracking-widest">
          MONS
        </Link>
        <Link
          to="/foods"
          search={parseCatalogSearch({ q: '' })}
          className="flex items-center gap-2 text-sm text-white/60"
        >
          <ArrowLeft className="size-4" /> Food explorer
        </Link>
      </header>
      <main className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-white/60">
            <span className="rounded-full border border-white/15 px-3 py-1">
              {food.dataset_kind}
            </span>
            <span>
              {food.food_group}
              {food.food_subgroup === null ? '' : ` / ${food.food_subgroup}`}
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{food.name}</h1>
          {(food.brand !== null || food.restaurant !== null) && (
            <p className="mt-2 text-lg text-white/60">
              {food.brand !== null ? `by ${food.brand}` : `at ${food.restaurant}`}
            </p>
          )}
          <div className="mt-5 flex items-center gap-3">
            <CatalogSourceBadge source={food.source} />
            <span className="text-xs text-white/40">Source record {food.source_id}</span>
          </div>
          <label className="mt-8 block text-xs text-white/60">
            Nutrition amount
            <select
              aria-label="Nutrition amount"
              className="mt-2 block w-full rounded-lg border border-white/15 bg-[#222] p-3 text-sm text-white"
              value={portionId}
              onChange={(event) => setPortionId(event.target.value)}
            >
              {portions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <section className="my-8 border-y border-white/10 py-7">
            <h2 className="mb-4 text-xl font-semibold">Macro overview</h2>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              {macros.map(([field, label, unit]) => (
                <div key={field}>
                  <p className="mb-2 text-xs text-white/50">{label}</p>
                  <strong className="flex items-center gap-1 text-lg font-medium">
                    {field === 'calories' && <Flame className="size-4 text-orange-400" />}
                    {formatNutrient(amount(field), unit)}
                  </strong>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Nutrient breakdown</h2>
            <p className="mt-2 text-xs leading-5 text-white/50">
              Reported nutrients for the selected amount. Percentages use FDA Daily Values, not
              personalized targets. No bar means a comparable Daily Value is unavailable.
            </p>
            {[...grouped]
              .toSorted(([left], [right]) => groupOrder.indexOf(left) - groupOrder.indexOf(right))
              .map(([group, values]) => (
                <section className="mt-8" key={group}>
                  <h3 className="mb-4 text-sm font-semibold">{group}</h3>
                  <div className="grid gap-x-7 gap-y-5 sm:grid-cols-2">
                    {values.map((nutrient) => {
                      const percent = dailyValuePercent(
                        nutrient.field,
                        nutrient.amount,
                        nutrient.unit,
                      )
                      return (
                        <div key={nutrient.field}>
                          <div className="flex items-start justify-between gap-3 text-xs">
                            <span className="text-white/70">{nutrient.name}</span>
                            <span className="shrink-0 tabular-nums">
                              {formatNutrient(nutrient.amount, nutrient.unit)}
                              {percent === null ? '' : ` · ${Math.round(percent)}%`}
                            </span>
                          </div>
                          {percent !== null && (
                            <div
                              role="meter"
                              aria-label={nutrient.name}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.min(100, percent)}
                              aria-valuetext={`${Math.round(percent)}% Daily Value`}
                              className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
                            >
                              <div
                                className={`h-full rounded-full ${group === 'Fats' ? 'bg-rose-400' : group === 'Carbohydrates' ? 'bg-amber-400' : group === 'Minerals' ? 'bg-sky-400' : 'bg-emerald-400'}`}
                                style={{ width: `${Math.min(100, percent)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            {nutrients.length === 0 && (
              <p className="py-6 text-sm text-white/50">No nutrient values reported.</p>
            )}
          </section>
        </div>
        <aside>
          <section
            aria-label="Nutrition facts"
            className="rounded-lg border border-white/20 bg-[#1c1c1c] p-4"
          >
            <h2 className="text-2xl font-bold">Nutrition Facts</h2>
            <p className="mt-2 text-xs leading-5 text-white/70">Amount: {portion?.label}</p>
            <div className="my-3 flex items-center justify-between border-y-4 border-white/70 py-3">
              <strong>Calories</strong>
              <strong className="text-2xl">{formatNutrient(amount('calories'), '').trim()}</strong>
            </div>
            <p className="mb-2 text-right text-[10px] text-white/60">% Daily Value</p>
            {facts.map(([field, label, unit]) => {
              const value = amount(field)
              const percent = value === null ? null : dailyValuePercent(field, value, unit)
              return (
                <div
                  className="flex justify-between gap-3 border-t border-white/10 py-2 text-xs"
                  key={field}
                >
                  <span>
                    {label} <span className="text-white/60">{formatNutrient(value, unit)}</span>
                  </span>
                  {percent !== null && <strong>{Math.round(percent)}%</strong>}
                </div>
              )
            })}
            <p className="mt-4 text-[10px] leading-4 text-white/50">
              — means not reported, not zero. This view is calculated from catalog data and is not
              the manufacturer’s label.
            </p>
          </section>
          <p className="mt-4 text-xs leading-5 text-white/45">
            <a
              className="underline underline-offset-2"
              href={DAILY_VALUE_SOURCE}
              target="_blank"
              rel="noreferrer"
            >
              FDA Daily Value reference
            </a>
            . Protein %DV is omitted because protein-quality information is unavailable. Nutrient
            forms without a comparable reference are shown as amounts only.
          </p>
          <p className="mt-4 text-[10px] text-white/35">
            Food ID {food.food_id}
            {food.gtin === null ? '' : ` · Barcode ${food.gtin}`}
          </p>
        </aside>
      </main>
    </div>
  )
}
