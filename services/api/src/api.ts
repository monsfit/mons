import { HttpApi, OpenApi } from 'effect/unstable/httpapi'

import { catalogApi } from './features/catalog.ts'
import { libraryApi } from './features/library.ts'
import { mealsApi } from './features/meals.ts'
import { nutritionApi } from './features/nutrition.ts'
import { profileApi } from './features/profile.ts'
import { systemApi } from './features/system.ts'
import { weightApi } from './features/weight.ts'
import { workoutsApi } from './features/workouts.ts'

export const MonsApi = HttpApi.make('mons')
  .add(systemApi)
  .add(catalogApi)
  .add(profileApi)
  .add(nutritionApi)
  .add(mealsApi)
  .add(libraryApi)
  .add(weightApi)
  .add(workoutsApi)
  .annotate(OpenApi.Title, 'Mons API')
  .annotate(OpenApi.Version, '0.1.0')
  .annotate(OpenApi.Description, 'Mons nutrition and workout API')
