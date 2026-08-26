import { Schema } from 'effect'

import { identifier, isoTimestampSchema, uuidSchema } from '../../schema-helpers.ts'

export const errorSchema = Schema.Struct({
  code: Schema.String,
  message: Schema.String,
}).pipe(identifier('Error'))

export const profilePathSchema = Schema.Struct({ profileId: uuidSchema })

export const timeRangeQuerySchema = Schema.Struct({
  from: isoTimestampSchema,
  to: isoTimestampSchema,
}).check(
  Schema.makeFilter((range) => Date.parse(range.from) < Date.parse(range.to), {
    expected: 'from before to',
  }),
)
