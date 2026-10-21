# Backup and restore

mirai-kin writes PostgreSQL custom-format dumps from the app container. Backups are stored outside the web root on the `backups_data` Docker volume and are only downloadable by an authenticated session.

## Scheduled backups

The `backup-daily` pg-boss job runs from the app container:

- default schedule: `0 3 * * *` (03:00 server time)
- default retention: 14 days
- enablement, schedule, and retention are configured in **Settings → Data & backups**

Each run writes `/backups/mirai-kin-<timestamp>.dump`, verifies that the file is non-empty, runs `pg_restore --list` against it, and records success or failure in `backups`.

The image includes `postgresql-client`; `docker-compose.yml` mounts the named `backups_data` volume at `/backups`.

## Manual backup

Use **Settings → Data & backups → Back up now**, or call the authenticated endpoint:

```bash
curl -X POST http://localhost:3100/api/backups
```

History, size, status, and download links appear in the same settings section.

## Full data export

**Download full export** streams a ZIP from `/api/export` (and `/api/v1/export` with the API bearer token). It contains one JSON file per domain plus `manifest.json`. Secrets, assistant conversations, and assistant actions are excluded.

## Restore

Restore is intentionally a CLI procedure; there is no destructive web endpoint.

1. Stop the app so writes cannot race the restore:
   ```bash
   docker compose stop app
   ```
2. Run the restore script with a dump from the backups volume:
   ```bash
   ./scripts/restore.sh /path/to/mirai-kin-<timestamp>.dump
   ```
   Inside the stack, copy the dump out first if needed:
   ```bash
   docker compose cp app:/backups/mirai-kin-<timestamp>.dump ./backup.dump
   ```
3. Start the app:
   ```bash
   docker compose start app
   ```
4. Verify the dashboard, recent transactions, and **Settings → Data & backups**.

`pg_restore --clean --if-exists` replaces the current schema objects. Keep a copy of the current database before restoring if you are unsure.

## Volume layout

| Volume | Purpose | Notes |
| --- | --- | --- |
| `fin-planner_db_data` | PostgreSQL data | Name retained from the original deployment to preserve existing data. |
| `backups_data` | Dump files | Mounted at `/backups`; not served by the web server. |

## Retention

The job deletes dumps and their history rows older than the configured retention window. A failed run is still recorded in the history so it can be investigated in the Data settings section.
