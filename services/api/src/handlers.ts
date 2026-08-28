import { Layer } from 'effect'

import { MonsApi } from './api.ts'
import { catalogHandlers } from './features/catalog.ts'
import { libraryHandlers } from './features/library.ts'
import { mealsHandlers } from './features/meals.ts'
import { nutritionHandlers } from './features/nutrition.ts'
import { profileHandlers } from './features/profile.ts'
import { systemHandlers } from './features/system.ts'
import { weightHandlers } from './features/weight.ts'
import { workoutsHandlers } from './features/workouts.ts'

export const handlerLayers = Layer.mergeAll(
  systemHandlers(MonsApi),
  catalogHandlers(MonsApi),
  profileHandlers(MonsApi),
  nutritionHandlers(MonsApi),
  mealsHandlers(MonsApi),
  libraryHandlers(MonsApi),
  weightHandlers(MonsApi),
  workoutsHandlers(MonsApi),
)
