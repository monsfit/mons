export {
  ApplicationRepository,
  applicationRepositoryLayer,
  makeApplicationRepository,
  RepositoryInvariantError,
  RepositoryOwnershipError,
} from './application-repository.ts'
export type {
  ApplicationRepositoryError,
  ApplicationRepositoryService,
  CreateFoodLogEntryInput,
  FoodLogEntryRecord,
  NutritionPlanRecord,
  SaveWeightLogEntryInput,
  SaveWorkoutInput,
  SaveWorkoutTemplateInput,
  WeightLogEntryRecord,
  WorkoutRecord,
  WorkoutSetInput,
  WorkoutTemplateExerciseInput,
  WorkoutTemplateRecord,
  WorkoutTemplateSetInput,
} from './application-repository.ts'
export { CatalogReader, catalogReaderLayer, makeCatalogReader } from './catalog-repository.ts'
export type {
  CatalogReaderService,
  CatalogSnapshotRecord,
  FoodNutrientRecord,
  FoodPortionRecord,
  FoodRecord,
  FoodSearchOptions,
} from './catalog-repository.ts'
export { createDatabaseLayer, DatabaseHealth, databaseHealthLayer } from './client.ts'
export type { DatabaseHealthService, DatabaseOptions } from './client.ts'
export {
  makeMealLogRepository,
  mealLogRepositoryLayer,
  MealLogInvariantError,
  MealLogNotFoundError,
  MealLogOwnershipError,
  MealLogRepository,
} from './meal-log-repository.ts'
export type {
  MealLogEntryRow,
  MealLogItemInput,
  MealLogRecord,
  MealLogRepositoryError,
  MealLogRepositoryService,
  MealLogRow,
  SaveMealLogInput,
} from './meal-log-repository.ts'
export {
  MealEstimateRepository,
  makeMealEstimateRepository,
  mealEstimateRepositoryLayer,
  MealEstimateInvariantError,
  MealEstimateOwnershipError,
} from './meal-estimate-repository.ts'
export type {
  MealEstimateItemRow,
  MealEstimateRecord,
  MealEstimateRepositoryError,
  MealEstimateRepositoryService,
  MealEstimateRow,
  SaveMealEstimateInput,
} from './meal-estimate-repository.ts'
export {
  grantRuntimeDatabaseAccess,
  migrateApplicationDatabase,
  migrateCatalogSearch,
  validateSchemaName,
} from './migrations.ts'
export { calculateNutritionPlan } from './nutrition-plan.ts'
export { calculateRecipeNutrition } from './recipe-nutrition.ts'
export type {
  NutritionValues,
  RecipeNutrition,
  WeightedNutritionValues,
} from './recipe-nutrition.ts'
export {
  UserFoodRepository,
  makeUserFoodRepository,
  userFoodRepositoryLayer,
} from './user-food-repository.ts'
export type {
  CustomFoodRecord,
  RecipeRecord,
  SaveCustomFoodInput,
  SaveRecipeInput,
  UserFoodRepositoryService,
} from './user-food-repository.ts'
export type { NutritionPlanCalculation, NutritionPlanInput } from './nutrition-plan.ts'
export type {
  DailyActivity,
  DatasetKind,
  FoodSourceKind,
  ExerciseFrequency,
  FoodLogEntryTable,
  FoodTable,
  IngestionRunTable,
  MealCategory,
  MetabolicSex,
  NutritionPlanTable,
  NutrientDefinitionTable,
  PortionTable,
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
