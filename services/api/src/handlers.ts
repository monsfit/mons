import { Layer } from 'effect'

import { RegolithApi } from './api.ts'
import { catalogHandlers } from './features/catalog.ts'
import { libraryHandlers } from './features/library.ts'
import { mealsHandlers } from './features/meals.ts'
import { nutritionHandlers } from './features/nutrition.ts'
import { profileHandlers } from './features/profile.ts'
import { systemHandlers } from './features/system.ts'
import { weightHandlers } from './features/weight.ts'
import { workoutsHandlers } from './features/workouts.ts'

export const handlerLayers = Layer.mergeAll(
  systemHandlers(RegolithApi),
  catalogHandlers(RegolithApi),
  profileHandlers(RegolithApi),
  nutritionHandlers(RegolithApi),
  mealsHandlers(RegolithApi),
  libraryHandlers(RegolithApi),
  weightHandlers(RegolithApi),
  workoutsHandlers(RegolithApi),
)
