import { HttpApi, OpenApi } from 'effect/unstable/httpapi'

import { catalogApi } from './features/catalog.ts'
import { libraryApi } from './features/library.ts'
import { mealsApi } from './features/meals.ts'
import { nutritionApi } from './features/nutrition.ts'
import { profileApi } from './features/profile.ts'
import { systemApi } from './features/system.ts'
import { weightApi } from './features/weight.ts'
import { workoutsApi } from './features/workouts.ts'

export const RegolithApi = HttpApi.make('regolith')
  .add(systemApi)
  .add(catalogApi)
  .add(profileApi)
  .add(nutritionApi)
  .add(mealsApi)
  .add(libraryApi)
  .add(weightApi)
  .add(workoutsApi)
  .annotate(OpenApi.Title, 'Regolith API')
  .annotate(OpenApi.Version, '0.1.0')
  .annotate(OpenApi.Description, 'Regolith nutrition and workout API')
