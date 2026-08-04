export interface ApiConfig {
  databaseUrl: string
  port: number
  schema: string
}

const schemaPattern = /^[a-z_][a-z0-9_]{0,31}$/

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): ApiConfig {
  const port = Number(environment.API_PORT ?? '3000')
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('API_PORT must be an integer between 1 and 65535')
  }

  const schema = environment.REGOLITH_SCHEMA ?? 'regolith'
  if (!schemaPattern.test(schema)) {
    throw new Error('REGOLITH_SCHEMA must be a safe lowercase PostgreSQL identifier')
  }

  return {
    databaseUrl:
      environment.DATABASE_URL ?? 'postgresql://regolith:regolith_local@localhost:5432/regolith',
    port,
    schema,
  }
}
