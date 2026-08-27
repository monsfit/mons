import { Schema } from 'effect'

import { identifier, uuidSchema } from '../../schema-helpers.ts'

export const profileSchema = Schema.Struct({ profileId: uuidSchema }).pipe(identifier('Profile'))
