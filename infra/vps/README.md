# Regolith VPS infrastructure

This directory is the version-controlled runbook for the Regolith VPS. It owns the PostgreSQL 18
development and production containers, the Cloudflare Tunnel connector, TLS and database-role
provisioning, and pgBackRest backups. Run these commands from a repository checkout on the VPS,
not as part of ordinary local application development.

## Layout

- `compose.yaml` defines both PostgreSQL environments and `cloudflared`.
- `postgres/` builds the PostgreSQL image and initializes application and migration roles.
- `pgbackrest.conf.template` configures production backups to the private R2 bucket.
- `provision.sh` creates host secrets and certificates, starts PostgreSQL, reconciles roles, and
  initializes pgBackRest.
- `restore-drill.sh` verifies a disposable point-in-time recovery.

## First-time provisioning

Provide `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_DEFAULT_ACCOUNT_ID`, `R2_BACKUP_ACCESS_KEY_ID`, and
`R2_BACKUP_SECRET_ACCESS_KEY`, then run:

```bash
pnpm vps:provision
pnpm vps:up
pnpm vps:backup
```

Host secrets, TLS material, backup credentials, and database volumes remain outside the repository
under `/etc/regolith` and Docker-managed storage.

Provisioning generates three passwords per environment under `/etc/regolith/postgres/<environment>`:
`admin-password`, `migration-password`, and `app-password`. It retains existing non-empty passwords
and TLS keys, making reruns safe. The pgBackRest configuration containing R2 credentials is installed
at `/etc/regolith/pgbackrest/pgbackrest.conf` with mode `0600`.

## Operations

```bash
pnpm vps:up
pnpm vps:backup
pnpm vps:restore-drill
```

Schedule `pnpm vps:backup` weekly with the VPS scheduler of choice. PostgreSQL continuously archives
WAL between full backups. The restore drill uses disposable Docker resources and removes them when
it exits. Use `docker compose -f infra/vps/compose.yaml ps|logs|down` for occasional direct container
operations rather than maintaining aliases for every Compose command.
