import { Schema } from 'effect'

import { identifier } from '../../schema-helpers.ts'

export const healthSchema = Schema.Struct({
  service: Schema.Literal('api'),
  status: Schema.Literal('ok'),
  version: Schema.String,
}).pipe(identifier('Health', 'API health status'))

export type Health = typeof healthSchema.Type
