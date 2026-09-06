import type { ColumnDef } from '@tanstack/react-table'
import { datasetKindLabel } from './catalog-search'
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
import { Badge } from '~/components/ui/badge'
import { CatalogTags } from '~/components/CatalogTags'

export const catalogColumns: ColumnDef<CatalogFood>[] = [
  {
    id: 'food',
    header: 'Food',
    size: 370,
    cell: ({ row: { original: food } }) => (
      <Link
        to="/food/$kind/$foodId"
        params={{ kind: food.datasetKind, foodId: food.foodId }}
        className="block min-w-0 rounded outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Badge variant={food.datasetKind === 'raw' ? 'raw' : 'subtle'} className="mb-1 rounded-md">
          {food.datasetKind === 'raw' ? 'RAW' : datasetKindLabel[food.datasetKind]}
        </Badge>
        <span
          className="block truncate text-sm font-medium"
          title={`${food.name} ${foodAttribution(food) ?? ''}`}
        >
          {food.name}{' '}
          <span className="font-normal text-muted-foreground">{foodAttribution(food)}</span>
        </span>
        <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Flame className="size-3.5 shrink-0 text-primary" />
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
    size: 220,
    cell: ({ row: { original: food } }) => <CatalogSourceBadge source={food.source} />,
  },
  {
    id: 'group',
    header: 'Category',
    size: 170,
    cell: ({ row: { original: food } }) => (
      <CatalogTags tags={[food.foodGroup, food.foodSubgroup]} />
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
