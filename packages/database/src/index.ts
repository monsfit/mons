export {
  CatalogReader,
  catalogReaderLayer,
  makeCatalogReader,
} from './features/catalog/repository.ts'
export { replaceCatalogWithFixture } from './catalog-fixture.ts'
export type {
  BrandRecord,
  CatalogReaderService,
  FoodNutrientRecord,
  FoodPortionRecord,
  FoodRecord,
  FoodGroupRecord,
  FoodSearchRecord,
  FoodSearchOptions,
  RestaurantListOptions,
  RestaurantRecord,
} from './features/catalog/repository.ts'
export { createDatabaseLayer, DatabaseHealth, databaseHealthLayer } from './core/client.ts'
export type { DatabaseHealthService, DatabaseOptions } from './core/client.ts'
export { RepositoryInvariantError, RepositoryOwnershipError } from './core/repository.ts'
export type { RepositoryError } from './core/repository.ts'
export {
  LibraryInvariantError,
  LibraryOwnershipError,
  LibraryRepository,
  libraryRepositoryLayer,
  makeLibraryRepository,
} from './features/library/repository.ts'
export type {
  CustomFoodRecord,
  LibraryRepositoryError,
  LibraryRepositoryService,
  RecipeRecord,
  SaveCustomFoodInput,
  SaveRecipeInput,
} from './features/library/repository.ts'
export {
  LegacyFoodLogRepository,
  legacyFoodLogRepositoryLayer,
  makeLegacyFoodLogRepository,
} from './features/meals/legacy-food-log-repository.ts'
export type {
  CreateFoodLogEntryInput,
  FoodLogEntryRecord,
  LegacyFoodLogRepositoryService,
} from './features/meals/legacy-food-log-repository.ts'
export {
  makeNutritionPlanRepository,
  NutritionPlanRepository,
  nutritionPlanRepositoryLayer,
} from './features/nutrition/repository.ts'
export type {
  NutritionPlanRecord,
  NutritionPlanRepositoryService,
  SaveNutritionPlanRecordInput,
} from './features/nutrition/repository.ts'
export {
  makeProfileRepository,
  ProfileRepository,
  profileRepositoryLayer,
} from './features/profile/repository.ts'
export type { ProfileRepositoryService } from './features/profile/repository.ts'
export {
  makeWeightRepository,
  WeightRepository,
  weightRepositoryLayer,
} from './features/weight/repository.ts'
export type {
  SaveWeightLogEntryInput,
  WeightLogEntryRecord,
  WeightRepositoryService,
} from './features/weight/repository.ts'
export {
  makeWorkoutRepository,
  WorkoutRepository,
  workoutRepositoryLayer,
} from './features/workouts/repository.ts'
export type {
  SaveWorkoutInput,
  SaveWorkoutTemplateInput,
  WorkoutRecord,
  WorkoutRepositoryService,
  WorkoutSetInput,
  WorkoutTemplateExerciseInput,
  WorkoutTemplateRecord,
  WorkoutTemplateSetInput,
} from './features/workouts/repository.ts'
export {
  makeMealLogRepository,
  mealLogRepositoryLayer,
  MealLogInvariantError,
  MealLogNotFoundError,
  MealLogOwnershipError,
  MealLogRepository,
} from './features/meals/meal-log-repository.ts'
export type {
  MealLogEntryRow,
  MealLogItemInput,
  MealLogRecord,
  MealLogRepositoryError,
  MealLogRepositoryService,
  MealLogRow,
  SaveMealLogInput,
} from './features/meals/meal-log-repository.ts'
export {
  MealEstimateRepository,
  makeMealEstimateRepository,
  mealEstimateRepositoryLayer,
  MealEstimateInvariantError,
  MealEstimateOwnershipError,
} from './features/meals/meal-estimate-repository.ts'
export type {
  MealEstimateItemRow,
  MealEstimateRecord,
  MealEstimateRepositoryError,
  MealEstimateRepositoryService,
  MealEstimateRow,
  SaveMealEstimateInput,
} from './features/meals/meal-estimate-repository.ts'
export {
  grantRuntimeDatabaseAccess,
  migrateApplicationDatabase,
  validateSchemaName,
} from './migrations.ts'
export type {
  DailyActivity,
  DatasetKind,
  FoodSourceKind,
  ExerciseFrequency,
  FoodLogEntryTable,
  IngestionRunTable,
  MealCategory,
  MetabolicSex,
  NutritionPlanTable,
  ProfileTable,
  WeightGoal,
  WeightLogEntryTable,
  WorkoutKind,
  WorkoutSessionTable,
  WorkoutSetTable,
  WorkoutTemplateExerciseTable,
  WorkoutTemplateSetTable,
  WorkoutTemplateTable,
} from './types.ts'
