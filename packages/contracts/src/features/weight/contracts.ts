import { Schema } from 'effect'

import { boundedNumber, identifier, isoTimestampSchema, uuidSchema } from '../../schema-helpers.ts'

export const weightLogEntryPathSchema = Schema.Struct({
  entryId: uuidSchema,
  profileId: uuidSchema,
})

export const createWeightLogEntrySchema = Schema.Struct({
  entryId: uuidSchema,
  measuredAt: isoTimestampSchema,
  weightKg: boundedNumber(30, 350),
}).pipe(identifier('CreateWeightLogEntry'))

export const weightLogEntrySchema = Schema.Struct({
  entryId: uuidSchema,
  measuredAt: isoTimestampSchema,
  weightKg: Schema.Number,
}).pipe(identifier('WeightLogEntry'))

export const weightLogResponseSchema = Schema.Struct({
  entries: Schema.Array(weightLogEntrySchema),
}).pipe(identifier('WeightLogResponse'))

export type WeightLogEntry = typeof weightLogEntrySchema.Type
