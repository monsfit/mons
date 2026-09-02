# Mons VPS infrastructure

This directory is the version-controlled runbook for the Mons VPS. It owns the PostgreSQL 18
staging and production containers, the Cloudflare Tunnel
connector, TLS and database-role provisioning, and pgBackRest backups. Run these commands from a
repository checkout on the VPS, not as part of ordinary local application development.

## Layout

- `compose.yaml` defines the staging and production PostgreSQL environments and `cloudflared`.
- `postgres/` builds the PostgreSQL image and initializes application and migration roles.
- `pgbackrest.conf.template` configures production backups to the private R2 bucket.
- `provision.sh` creates host secrets and certificates, starts PostgreSQL, reconciles roles, and
  initializes pgBackRest.
- `restore-drill.sh` verifies a disposable point-in-time recovery.
- `check-postgres-operations.sh` validates database, WAL archive, and backup health and publishes
  Prometheus textfile metrics.
- `install-backup-timers.sh` installs the version-controlled backup and health-check systemd units.
- `monitoring/` contains the independent Prometheus, Grafana, Node Exporter, cAdvisor, and
  PostgreSQL exporter stack.

## First-time provisioning

Provide `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_DEFAULT_ACCOUNT_ID`, `R2_BACKUP_ACCESS_KEY_ID`, and
`R2_BACKUP_SECRET_ACCESS_KEY`, then run:

```bash
pnpm vps:provision
pnpm vps:up
pnpm vps:backup
pnpm vps:backup:install-timers
```

Host secrets, TLS material, backup credentials, and database volumes remain outside the repository
under `/etc/mons` and Docker-managed storage.

Provisioning generates three passwords per deployed environment under `/etc/mons/postgres/<environment>`:
`admin-password`, `migration-password`, and `app-password`. It retains existing non-empty passwords
and TLS keys, making reruns safe. The pgBackRest configuration containing R2 credentials is installed
at `/etc/mons/pgbackrest/pgbackrest.conf` with mode `0600`.

The environments are independent PostgreSQL containers and volumes:

| Environment | Database        | Tailscale port | Docker hostname                       |
| ----------- | --------------- | -------------- | ------------------------------------- |
| Staging     | `mons_dev`      | `5433`         | `postgres-dev.internal.mons.fit`      |
| Production  | `mons_prod`     | `5434`         | `postgres-prod.internal.mons.fit`     |

Ordinary development uses the Mac-local Docker database. The VPS has no personal development
database. Wrangler references the existing
`mons-development` and `mons-production` Hyperdrive configurations directly.

## Operations

```bash
pnpm vps:up
pnpm vps:backup
pnpm vps:restore-drill
```

Schedule `pnpm vps:backup` weekly with the VPS scheduler of choice. PostgreSQL continuously archives
WAL between full backups. The installed timers run a weekly full backup, daily differential backups,
and a health check every 15 minutes. The restore drill uses disposable Docker resources and removes
them when it exits. Use `docker compose -f infra/vps/compose.yaml ps|logs|down` for occasional direct
container operations rather than maintaining aliases for every Compose command.

The R2 repository retains four full backup sets and their required WAL. Zstandard compression,
object bundling, and block incremental storage reduce transfer time, object count, and the size of
subsequent differential backups. Synchronous WAL archiving is intentional for this low-volume
cluster: PostgreSQL does not report success until R2 has durably accepted each segment.

## Monitoring

Monitoring observes host, container, and PostgreSQL health. Provisioning creates a separate
least-privilege `pg_monitor` login for each database and stores its generated password under
`/etc/mons/monitoring`, alongside Grafana's administrator password. The database containers
preload `pg_stat_statements`; provisioning enables the extension in the application and exporter
databases. The query dashboard tracks normalized top-level statements, excludes utility commands,
and limits each exporter scrape to 50 statements with query text truncated to 160 characters. The
database containers must be running before provisioning:

```bash
pnpm monitoring:provision
pnpm monitoring:up
```

Grafana is available only over Tailscale at `http://<VPS_MAGICDNS_NAME>:3000`. Prometheus and the
exporters are private. Use `pnpm monitoring:logs` to inspect the stack and
`pnpm monitoring:stop` to stop it without deleting stored metrics or dashboards.
