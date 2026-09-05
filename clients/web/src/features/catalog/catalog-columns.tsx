import type { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { Flame } from 'lucide-react'
import type { CatalogFood } from './catalog-functions'
import {
  foodAttribution,
  foodPortionLabel,
  formatFoodNutrient,
  foodNutrientAmount,
} from './catalog-presentation'
import { formatNutritionAmount } from './nutrition'
import { tableNutrients } from './table-nutrients'
import { CatalogSourceBadge } from '~/components/CatalogSourceBadge'

export const catalogColumns: ColumnDef<CatalogFood>[] = [
  {
    id: 'food',
    header: 'Food',
    size: 370,
    cell: ({ row: { original: food } }) => (
      <Link
        to="/food/$kind/$foodId"
        params={{ kind: food.datasetKind, foodId: food.foodId }}
        className="block min-w-0 rounded outline-offset-2 focus-visible:outline-2 focus-visible:outline-lime-200"
      >
        <span
          className="block truncate text-sm font-medium"
          title={`${food.name} ${foodAttribution(food) ?? ''}`}
        >
          {food.name} <span className="font-normal text-white/55">{foodAttribution(food)}</span>
        </span>
        <span className="mt-1 flex items-center gap-1 text-xs text-white/50">
          <Flame className="size-3.5 shrink-0 text-orange-400" />
          {formatFoodNutrient(food, food.calories, 'kcal')}
          <span>·</span>
          <span className="truncate">{foodPortionLabel(food)}</span>
        </span>
      </Link>
    ),
  },
  {
    id: 'source',
    header: 'Source',
    size: 190,
    cell: ({ row: { original: food } }) => (
      <>
        <CatalogSourceBadge source={food.source} />
        <span className="mt-1 w-fit rounded-full border border-white/10 bg-white/5 px-2 text-[10px] text-white/50">
          {food.datasetKind}
        </span>
      </>
    ),
  },
  {
    id: 'group',
    header: 'Group',
    size: 150,
    cell: ({ row: { original: food } }) => (
      <>
        <span
          title={food.foodGroup}
          className="w-fit max-w-full truncate rounded-full border border-violet-300/20 bg-violet-300/5 px-2 py-1 text-[10px] text-violet-100/80"
        >
          {food.foodGroup}
        </span>
        {food.foodSubgroup !== null && (
          <span
            title={food.foodSubgroup}
            className="mt-1 w-fit max-w-full truncate rounded-full border border-white/10 bg-white/5 px-2 text-[10px] text-white/50"
          >
            {food.foodSubgroup}
          </span>
        )}
      </>
    ),
  },
  {
    id: 'calories',
    header: 'Calories',
    size: 110,
    cell: ({ row: { original: food } }) => formatFoodNutrient(food, food.calories, 'kcal'),
  },
  {
    id: 'protein',
    header: 'Protein',
    size: 90,
    cell: ({ row: { original: food } }) => formatFoodNutrient(food, food.protein),
  },
  {
    id: 'fat',
    header: 'Fat',
    size: 90,
    cell: ({ row: { original: food } }) => formatFoodNutrient(food, food.totalFat),
  },
  {
    id: 'carbs',
    header: 'Carbs',
    size: 90,
    cell: ({ row: { original: food } }) => formatFoodNutrient(food, food.carbohydrates),
  },
  ...tableNutrients.map((nutrient): ColumnDef<CatalogFood> => ({
    id: nutrient.field,
    header: `${nutrient.label} (${nutrient.unit})`,
    size: 125,
    cell: ({ row: { original: food } }) =>
      formatNutritionAmount(
        foodNutrientAmount(food, food.additionalNutrients[nutrient.field] ?? null),
        nutrient.unit,
      ),
  })),
]
