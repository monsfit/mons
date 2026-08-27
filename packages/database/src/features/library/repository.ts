import { Context, Data, Effect, Layer, Schema } from 'effect'
import { SqlClient, SqlError } from 'effect/unstable/sql'

import { validateSchemaName } from '../../migrations.ts'

const nullableNumber = Schema.NullOr(Schema.Number)
const customFoodRowSchema = Schema.Struct({
  barcode: Schema.NullOr(Schema.String),
  brand: Schema.NullOr(Schema.String),
  calories_per_100g: nullableNumber,
  carbohydrates_per_100g: nullableNumber,
  created_at: Schema.Date,
  fat_per_100g: nullableNumber,
  food_id: Schema.String,
  image_data_base64: Schema.NullOr(Schema.String),
  name: Schema.String,
  nutrition_label_image_data_base64: Schema.NullOr(Schema.String),
  profile_id: Schema.String,
  protein_per_100g: nullableNumber,
  updated_at: Schema.Date,
})
const portionRowSchema = Schema.Struct({
  amount: Schema.Number,
  food_id: Schema.String,
  name: Schema.String,
  ordinal: Schema.Number,
  unit: Schema.Literals(['g', 'ml']),
})
const recipeRowSchema = Schema.Struct({
  calories_per_100g: nullableNumber,
  carbohydrates_per_100g: nullableNumber,
  created_at: Schema.Date,
  fat_per_100g: nullableNumber,
  image_data_base64: Schema.NullOr(Schema.String),
  name: Schema.String,
  notes: Schema.String,
  nutrition_status: Schema.Literals(['calculated', 'estimate_pending', 'mixed']),
  profile_id: Schema.String,
  protein_per_100g: nullableNumber,
  recipe_id: Schema.String,
  servings: nullableNumber,
  total_yield_grams: Schema.Number,
  updated_at: Schema.Date,
})
const recipeIngredientRowSchema = Schema.Struct({
  calories_per_100g: nullableNumber,
  carbohydrates_per_100g: nullableNumber,
  fat_per_100g: nullableNumber,
  food_id: Schema.String,
  ingredient_id: Schema.String,
  name: Schema.String,
  ordinal: Schema.Number,
  protein_per_100g: nullableNumber,
  quantity_grams: Schema.Number,
  recipe_id: Schema.String,
  source_kind: Schema.Literals(['raw', 'branded', 'custom']),
})
const freeformIngredientRowSchema = Schema.Struct({
  calories: nullableNumber,
  carbohydrates: nullableNumber,
  ingredient_id: Schema.String,
  name: Schema.NullOr(Schema.String),
  ordinal: Schema.Number,
  protein: nullableNumber,
  quantity: nullableNumber,
  recipe_id: Schema.String,
  text: Schema.String,
  total_fat: nullableNumber,
  unit: Schema.NullOr(
    Schema.Literals([
      'can',
      'clove',
      'cup',
      'g',
      'kg',
      'l',
      'ml',
      'oz',
      'piece',
      'pinch',
      'lb',
      'tbsp',
      'tsp',
    ]),
  ),
})

export type CustomFoodRow = typeof customFoodRowSchema.Type
export type CustomFoodPortionRow = typeof portionRowSchema.Type
export type RecipeRow = typeof recipeRowSchema.Type
export type RecipeIngredientRow = typeof recipeIngredientRowSchema.Type
export type FreeformRecipeIngredientRow = typeof freeformIngredientRowSchema.Type
export interface CustomFoodRecord {
  readonly food: CustomFoodRow
  readonly portions: ReadonlyArray<CustomFoodPortionRow>
}
export interface RecipeRecord {
  readonly freeformIngredients: ReadonlyArray<FreeformRecipeIngredientRow>
  readonly ingredients: ReadonlyArray<RecipeIngredientRow>
  readonly recipe: RecipeRow
}

export interface SaveCustomFoodInput {
  readonly barcode: string | null
  readonly brand: string | null
  readonly calories: number | null
  readonly carbohydrates: number | null
  readonly foodId: string
  readonly imageDataBase64: string | null
  readonly name: string
  readonly nutritionLabelImageDataBase64: string | null
  readonly portions: ReadonlyArray<{
    readonly amount: number
    readonly name: string
    readonly unit: 'g' | 'ml'
  }>
  readonly protein: number | null
  readonly totalFat: number | null
}
export interface SaveRecipeInput {
  readonly freeformIngredients: ReadonlyArray<{
    readonly calories: number | null
    readonly carbohydrates: number | null
    readonly ingredientId: string
    readonly name: string | null
    readonly protein: number | null
    readonly quantity: number | null
    readonly text: string
    readonly totalFat: number | null
    readonly unit:
      | 'can'
      | 'clove'
      | 'cup'
      | 'g'
      | 'kg'
      | 'l'
      | 'ml'
      | 'oz'
      | 'piece'
      | 'pinch'
      | 'lb'
      | 'tbsp'
      | 'tsp'
      | null
  }>
  readonly imageDataBase64: string | null
  readonly ingredients: ReadonlyArray<{
    readonly calories: number | null
    readonly carbohydrates: number | null
    readonly foodId: string
    readonly ingredientId: string
    readonly name: string
    readonly protein: number | null
    readonly quantityGrams: number
    readonly sourceKind: 'raw' | 'branded' | 'custom'
    readonly totalFat: number | null
  }>
  readonly name: string
  readonly notes: string
  readonly nutrition: {
    readonly calories: number | null
    readonly carbohydrates: number | null
    readonly protein: number | null
    readonly status: 'calculated' | 'estimate_pending' | 'mixed'
    readonly totalFat: number | null
  }
  readonly recipeId: string
  readonly servings: number | null
  readonly totalYieldGrams: number
}

export class LibraryOwnershipError extends Data.TaggedError('LibraryOwnershipError')<{
  readonly message: string
}> {}
export class LibraryInvariantError extends Data.TaggedError('LibraryInvariantError')<{
  readonly message: string
}> {}
export type LibraryRepositoryError =
  | SqlError.SqlError
  | Schema.SchemaError
  | LibraryOwnershipError
  | LibraryInvariantError

export interface LibraryRepositoryService {
  readonly deleteCustomFood: (
    profileId: string,
    foodId: string,
  ) => Effect.Effect<boolean, SqlError.SqlError>
  readonly deleteRecipe: (
    profileId: string,
    recipeId: string,
  ) => Effect.Effect<boolean, SqlError.SqlError>
  readonly findCustomFoodByBarcode: (
    profileId: string,
    barcode: string,
  ) => Effect.Effect<CustomFoodRecord | undefined, LibraryRepositoryError>
  readonly listCustomFoods: (
    profileId: string,
  ) => Effect.Effect<ReadonlyArray<CustomFoodRecord>, LibraryRepositoryError>
  readonly listRecipes: (
    profileId: string,
  ) => Effect.Effect<ReadonlyArray<RecipeRecord>, LibraryRepositoryError>
  readonly saveCustomFood: (
    profileId: string,
    input: SaveCustomFoodInput,
  ) => Effect.Effect<CustomFoodRecord, LibraryRepositoryError>
  readonly saveRecipe: (
    profileId: string,
    input: SaveRecipeInput,
  ) => Effect.Effect<RecipeRecord, LibraryRepositoryError>
}

export const LibraryRepository = Context.Service<LibraryRepositoryService>(
  '@regolith/database/LibraryRepository',
)

const decode = <S extends Schema.Constraint>(schema: S, rows: ReadonlyArray<unknown>) =>
  Schema.decodeUnknownEffect(Schema.Array(schema))(rows)

export const makeLibraryRepository = (
  options: { readonly appSchema?: string; readonly now?: () => Date } = {},
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const schema = yield* validateSchemaName(options.appSchema ?? 'regolith_app')
    const now = options.now ?? (() => new Date())
    const customFoods = sql(`${schema}.custom_foods`)
    const portions = sql(`${schema}.custom_food_portions`)
    const recipes = sql(`${schema}.recipes`)
    const ingredients = sql(`${schema}.recipe_ingredients`)
    const freeform = sql(`${schema}.recipe_freeform_ingredients`)

    const customFoodById = Effect.fn('LibraryRepository.customFoodById')(function* (
      profileId: string,
      foodId: string,
    ) {
      const foodRows = yield* decode(
        customFoodRowSchema,
        yield* sql`SELECT * FROM ${customFoods}
          WHERE profile_id = ${profileId} AND food_id = ${foodId}`,
      )
      const food = foodRows[0]
      if (food === undefined) return undefined
      const portionRows = yield* decode(
        portionRowSchema,
        yield* sql`SELECT * FROM ${portions}
          WHERE food_id = ${foodId} ORDER BY ordinal`,
      )
      return { food, portions: portionRows }
    })

    const recipeById = Effect.fn('LibraryRepository.recipeById')(function* (
      profileId: string,
      recipeId: string,
    ) {
      const recipeRows = yield* decode(
        recipeRowSchema,
        yield* sql`SELECT * FROM ${recipes}
          WHERE profile_id = ${profileId} AND recipe_id = ${recipeId}`,
      )
      const recipe = recipeRows[0]
      if (recipe === undefined) return undefined
      const [ingredientRows, freeformRows] = yield* Effect.all(
        [
          sql`SELECT * FROM ${ingredients} WHERE recipe_id = ${recipeId} ORDER BY ordinal`.pipe(
            Effect.flatMap((rows) => decode(recipeIngredientRowSchema, rows)),
          ),
          sql`SELECT * FROM ${freeform} WHERE recipe_id = ${recipeId} ORDER BY ordinal`.pipe(
            Effect.flatMap((rows) => decode(freeformIngredientRowSchema, rows)),
          ),
        ],
        { concurrency: 'unbounded' },
      )
      return { freeformIngredients: freeformRows, ingredients: ingredientRows, recipe }
    })

    const listCustomFoods = Effect.fn('LibraryRepository.listCustomFoods')(function* (
      profileId: string,
    ) {
      const foodRows = yield* decode(
        customFoodRowSchema,
        yield* sql`SELECT * FROM ${customFoods} WHERE profile_id = ${profileId} ORDER BY updated_at DESC, food_id`,
      )
      if (foodRows.length === 0) return []
      const portionRows = yield* decode(
        portionRowSchema,
        yield* sql`SELECT * FROM ${portions} WHERE ${sql.in(
          'food_id',
          foodRows.map((food) => food.food_id),
        )} ORDER BY food_id, ordinal`,
      )
      const portionsByFood = Map.groupBy(portionRows, (portion) => portion.food_id)
      return foodRows.map((food) => ({
        food,
        portions: portionsByFood.get(food.food_id) ?? [],
      }))
    })
    const listRecipes = Effect.fn('LibraryRepository.listRecipes')(function* (profileId: string) {
      const recipeRows = yield* decode(
        recipeRowSchema,
        yield* sql`SELECT * FROM ${recipes} WHERE profile_id = ${profileId} ORDER BY updated_at DESC, recipe_id`,
      )
      if (recipeRows.length === 0) return []
      const ids = recipeRows.map((recipe) => recipe.recipe_id)
      const [ingredientRows, freeformRows] = yield* Effect.all(
        [
          sql`SELECT * FROM ${ingredients} WHERE ${sql.in('recipe_id', ids)} ORDER BY recipe_id, ordinal`.pipe(
            Effect.flatMap((rows) => decode(recipeIngredientRowSchema, rows)),
          ),
          sql`SELECT * FROM ${freeform} WHERE ${sql.in('recipe_id', ids)} ORDER BY recipe_id, ordinal`.pipe(
            Effect.flatMap((rows) => decode(freeformIngredientRowSchema, rows)),
          ),
        ],
        { concurrency: 'unbounded' },
      )
      const ingredientsByRecipe = Map.groupBy(ingredientRows, (item) => item.recipe_id)
      const freeformByRecipe = Map.groupBy(freeformRows, (item) => item.recipe_id)
      return recipeRows.map((recipe) => ({
        freeformIngredients: freeformByRecipe.get(recipe.recipe_id) ?? [],
        ingredients: ingredientsByRecipe.get(recipe.recipe_id) ?? [],
        recipe,
      }))
    })
    const saveCustomFood = Effect.fn('LibraryRepository.saveCustomFood')(function* (
      profileId: string,
      input: SaveCustomFoodInput,
    ) {
      yield* sql.withTransaction(
        Effect.gen(function* () {
          const owner = yield* sql<{ readonly belongs_to_profile: boolean }>`
            SELECT profile_id = ${profileId} AS belongs_to_profile
            FROM ${customFoods} WHERE food_id = ${input.foodId}
          `
          if (owner[0] !== undefined && !owner[0].belongs_to_profile)
            return yield* new LibraryOwnershipError({
              message: 'Custom food does not belong to this profile',
            })
          yield* sql`INSERT INTO ${customFoods} (food_id, profile_id, name, brand, barcode, calories_per_100g, protein_per_100g, carbohydrates_per_100g, fat_per_100g, image_data_base64, nutrition_label_image_data_base64)
          VALUES (${input.foodId}, ${profileId}, ${input.name}, ${input.brand}, ${input.barcode}, ${input.calories}, ${input.protein}, ${input.carbohydrates}, ${input.totalFat}, ${input.imageDataBase64}, ${input.nutritionLabelImageDataBase64})
          ON CONFLICT (food_id) DO UPDATE SET name = EXCLUDED.name, brand = EXCLUDED.brand, barcode = EXCLUDED.barcode, calories_per_100g = EXCLUDED.calories_per_100g, protein_per_100g = EXCLUDED.protein_per_100g, carbohydrates_per_100g = EXCLUDED.carbohydrates_per_100g, fat_per_100g = EXCLUDED.fat_per_100g, image_data_base64 = EXCLUDED.image_data_base64, nutrition_label_image_data_base64 = EXCLUDED.nutrition_label_image_data_base64, updated_at = ${now()}`
          yield* sql`DELETE FROM ${portions} WHERE food_id = ${input.foodId}`
          if (input.portions.length > 0)
            yield* sql`INSERT INTO ${portions} ${sql.insert(input.portions.map((portion, ordinal) => ({ ...portion, food_id: input.foodId, ordinal })))}`
        }),
      )
      const saved = yield* customFoodById(profileId, input.foodId)
      if (saved === undefined)
        return yield* new LibraryInvariantError({
          message: 'Saved custom food could not be loaded',
        })
      return saved
    })
    const saveRecipe = Effect.fn('LibraryRepository.saveRecipe')(function* (
      profileId: string,
      input: SaveRecipeInput,
    ) {
      yield* sql.withTransaction(
        Effect.gen(function* () {
          const owner = yield* sql<{ readonly belongs_to_profile: boolean }>`
            SELECT profile_id = ${profileId} AS belongs_to_profile
            FROM ${recipes} WHERE recipe_id = ${input.recipeId}
          `
          if (owner[0] !== undefined && !owner[0].belongs_to_profile)
            return yield* new LibraryOwnershipError({
              message: 'Recipe does not belong to this profile',
            })
          yield* sql`INSERT INTO ${recipes} (recipe_id, profile_id, name, notes, total_yield_grams, servings, calories_per_100g, protein_per_100g, carbohydrates_per_100g, fat_per_100g, nutrition_status, image_data_base64)
          VALUES (${input.recipeId}, ${profileId}, ${input.name}, ${input.notes}, ${input.totalYieldGrams}, ${input.servings}, ${input.nutrition.calories}, ${input.nutrition.protein}, ${input.nutrition.carbohydrates}, ${input.nutrition.totalFat}, ${input.nutrition.status}, ${input.imageDataBase64})
          ON CONFLICT (recipe_id) DO UPDATE SET name = EXCLUDED.name, notes = EXCLUDED.notes, total_yield_grams = EXCLUDED.total_yield_grams, servings = EXCLUDED.servings, calories_per_100g = EXCLUDED.calories_per_100g, protein_per_100g = EXCLUDED.protein_per_100g, carbohydrates_per_100g = EXCLUDED.carbohydrates_per_100g, fat_per_100g = EXCLUDED.fat_per_100g, nutrition_status = EXCLUDED.nutrition_status, image_data_base64 = EXCLUDED.image_data_base64, updated_at = ${now()}`
          yield* sql`DELETE FROM ${ingredients} WHERE recipe_id = ${input.recipeId}`
          yield* sql`DELETE FROM ${freeform} WHERE recipe_id = ${input.recipeId}`
          if (input.ingredients.length > 0)
            yield* sql`INSERT INTO ${ingredients} ${sql.insert(input.ingredients.map((item, ordinal) => ({ calories_per_100g: item.calories, carbohydrates_per_100g: item.carbohydrates, fat_per_100g: item.totalFat, food_id: item.foodId, ingredient_id: item.ingredientId, name: item.name, ordinal, protein_per_100g: item.protein, quantity_grams: item.quantityGrams, recipe_id: input.recipeId, source_kind: item.sourceKind })))}`
          if (input.freeformIngredients.length > 0)
            yield* sql`INSERT INTO ${freeform} ${sql.insert(input.freeformIngredients.map((item, ordinal) => ({ calories: item.calories, carbohydrates: item.carbohydrates, ingredient_id: item.ingredientId, name: item.name, ordinal, protein: item.protein, quantity: item.quantity, recipe_id: input.recipeId, text: item.text, total_fat: item.totalFat, unit: item.unit })))}`
        }),
      )
      const saved = yield* recipeById(profileId, input.recipeId)
      if (saved === undefined)
        return yield* new LibraryInvariantError({ message: 'Saved recipe could not be loaded' })
      return saved
    })
    const findCustomFoodByBarcode = Effect.fn('LibraryRepository.findCustomFoodByBarcode')(
      function* (profileId: string, barcode: string) {
        const rows = yield* sql<{ readonly food_id: string }>`SELECT food_id FROM ${customFoods}
          WHERE profile_id = ${profileId} AND barcode = ${barcode}
          ORDER BY updated_at DESC LIMIT 1`
        const foodId = rows[0]?.food_id
        return foodId === undefined ? undefined : yield* customFoodById(profileId, foodId)
      },
    )
    const deleteCustomFood = Effect.fn('LibraryRepository.deleteCustomFood')(function* (
      profileId: string,
      foodId: string,
    ) {
      return (
        (yield* sql`DELETE FROM ${customFoods} WHERE profile_id = ${profileId} AND food_id = ${foodId} RETURNING food_id`)
          .length > 0
      )
    })
    const deleteRecipe = Effect.fn('LibraryRepository.deleteRecipe')(function* (
      profileId: string,
      recipeId: string,
    ) {
      return (
        (yield* sql`DELETE FROM ${recipes} WHERE profile_id = ${profileId} AND recipe_id = ${recipeId} RETURNING recipe_id`)
          .length > 0
      )
    })
    return LibraryRepository.of({
      deleteCustomFood,
      deleteRecipe,
      findCustomFoodByBarcode,
      listCustomFoods,
      listRecipes,
      saveCustomFood,
      saveRecipe,
    })
  })

export const libraryRepositoryLayer = (
  options: { readonly appSchema?: string; readonly now?: () => Date } = {},
) => Layer.effect(LibraryRepository, makeLibraryRepository(options))
