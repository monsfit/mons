# Existing VPS Mons name cutover

The current configuration uses `mons_dev`, `mons_prod`, Mons role names, `/etc/mons`, the
`mons-prod` pgBackRest stanza, and `/home/ubuntu/projects/mons`. A VPS that was provisioned before
this rename must be cut over once during a maintenance window; do not simply restart it with the
new Compose file.

1. Take and verify a final backup with the old configuration.
2. Copy `/etc/regolith` to `/etc/mons` while preserving ownership and modes. Keep the old directory
   until the new backup and monitoring jobs have succeeded.
3. Stop application traffic, then rename each database and its admin, migration, application, and
   monitoring roles in PostgreSQL. Keep their passwords unchanged. The migration command will
   rename `regolith_app` to `mons_app` and `regolith` to `mons_catalog` without copying data.
4. Update both Cloudflare Hyperdrive configurations to use the corresponding Mons database and
   application role. Their IDs and TLS path remain unchanged.
5. Tag the VPS as `tag:database` and allow `tag:ci` to reach that tag on ports `5433` and `5434`.
   Both PostgreSQL ports bind to localhost and Tailscale Serve publishes them only inside the
   tailnet; `5434` is the production migration path.
6. Move the VPS checkout to `/home/ubuntu/projects/mons`, run `pnpm vps:provision`, and start the
   stack. Provisioning creates the new `mons-prod` pgBackRest stanza; immediately take a full backup
   before restoring application traffic.
7. Run the restore drill and monitoring checks, then install the renamed systemd timers. Remove the
   old units only after the new timers have fired successfully.

Database and role renames are intentionally not automated by this repository because they require
coordinating the external Hyperdrive credentials in the same maintenance window. The Docker volume
names and internal database hostnames do not change, so no PostgreSQL data directory is copied.
