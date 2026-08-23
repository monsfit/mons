import { Client } from 'pg'
import { Resource } from 'sst'

const resources = Resource as unknown as {
  readonly Database: { readonly connectionString: string }
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (new URL(request.url).pathname !== '/health') {
      return new Response('Not found', { status: 404 })
    }

    const client = new Client({ connectionString: resources.Database.connectionString })
    try {
      await client.connect()
      const result = await client.query<{
        current_database: string
        current_user: string
        server_version: string
      }>(
        "SELECT current_database(), current_user, current_setting('server_version') AS server_version",
      )
      return Response.json({ status: 'ok', ...result.rows[0] })
    } catch (cause) {
      console.error('Hyperdrive smoke check failed', cause)
      return Response.json({ status: 'error' }, { status: 503 })
    } finally {
      await client.end().catch(() => undefined)
    }
  },
}
